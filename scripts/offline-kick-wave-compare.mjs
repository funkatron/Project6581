#!/usr/bin/env node
/**
 * Offline reSIDfp kick A/B: triangle vs triangle+noise (6581 combined waveform).
 * No browser — same register path as src/sid-registers.js + drum bus on SID 4.
 *
 *   node scripts/offline-kick-wave-compare.mjs [--out DIR]
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SidRegisters, midiHz, freqRegister, PAL_CLOCK} from '../src/sid-registers.js';
import {encodeWav} from '../src/wav-encoder.js';
import {pitchOffsetAt} from '../src/pitch-envelope.js';
import {pitchEnvelopeTemplates} from '../src/pitch-envelope-editor.js';
import {drumEngineFilterRegisters} from '../src/drum-engine-filter.js';
import {drumBusVolumeForLane} from '../src/drum-lane-trigger.js';
import {defaultDrumKit} from '../src/drum-step-sequencer.js';
import {defaultDrumEngineSettings} from '../src/sid-engines.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DRUM_CHIP=3;
const SAMPLE_RATE=48000;
const BLOCK=128;
const KICK_NOTE=36;

const kickVoice={
 wave:'triangle+noise',
 attack:0,decay:0.24,sustain:0,release:0.02,pulse:50,
 pitchEnvelope:pitchEnvelopeTemplates().kick,
};

function loadWasm(){
 const bytes=readFileSync(path.join(root,'dist/residfp.wasm'));
 return WebAssembly.compile(bytes).then(mod=>{
  const imports={};
  for(const item of WebAssembly.Module.imports(mod)){
   if(item.kind==='function')(imports[item.module]??={})[item.name]=()=>0;
   else throw Error('Unsupported import: '+JSON.stringify(item));
  }
  return WebAssembly.instantiate(mod,imports);
 });
}

function chipRegs(write){
 return new SidRegisters((reg,val)=>write(DRUM_CHIP*0x20+reg),PAL_CLOCK);
}

function busFilterRegs(){
 const engine=defaultDrumEngineSettings();
 const lane=defaultDrumKit().lanes.kick;
 const volume=drumBusVolumeForLane(engine.filter,lane,'kick');
 return drumEngineFilterRegisters({
  cutoff:engine.filter.cutoff,
  resonance:engine.filter.resonance,
  volume,
  mode:engine.filter.mode,
  routing:7,
 });
}

function readMonoPcm(exports,frames){
 const ptr=exports.sid_pcm_ptr();
 const stereo=new Int16Array(exports.memory.buffer,ptr,frames*2);
 const mono=new Int16Array(frames);
 for(let i=0;i<frames;i++)mono[i]=stereo[i*2];
 return mono;
}

function renderKick(exports,{wave,label,voiceOverride=null,note=KICK_NOTE,ms=700}){
 if(exports.sid_reset)exports.sid_reset();
 if(exports.sid_set_chip_gain)exports.sid_set_chip_gain(DRUM_CHIP,18);
 const write=(reg,val)=>exports.sid_write(reg,val);
 const sid=chipRegs(write);
 sid.setFilter(busFilterRegs());
 const voice=voiceOverride??{...kickVoice,wave};
 sid.noteOn(0,note,voice);
 const totalMs=ms;
 const chunks=[];
 let elapsedMs=0;
 while(elapsedMs<totalMs){
  const semis=pitchOffsetAt(voice.pitchEnvelope,elapsedMs);
  const note=KICK_NOTE+semis;
  const freq=freqRegister(midiHz(note),PAL_CLOCK);
  write(DRUM_CHIP*0x20,freq&255);
  write(DRUM_CHIP*0x20+1,freq>>8);
  const rendered=exports.sid_render(BLOCK);
  if(rendered!==BLOCK)throw Error('sid_render failed for '+label);
  chunks.push(readMonoPcm(exports,rendered));
  elapsedMs+=BLOCK/SAMPLE_RATE*1000;
 }
 sid.noteOff(0);
 for(let extra=0;extra<6;extra++){
  const rendered=exports.sid_render(BLOCK);
  chunks.push(readMonoPcm(exports,rendered));
 }
 return encodeWav(chunks,SAMPLE_RATE);
}

async function main(){
 const outArg=process.argv.includes('--out')?path.resolve(process.argv[process.argv.indexOf('--out')+1])
  :'/opt/cursor/artifacts/drum-combined-wave';
 mkdirSync(outArg,{recursive:true});
 const {exports:e}=await loadWasm();
 e._initialize?.();
 if(e.sid_init(6581,SAMPLE_RATE)!==1)throw Error('sid_init failed');
 const triangleOnly=renderKick(e,{wave:'triangle',label:'triangle'});
 const combined=renderKick(e,{wave:'triangle+noise',label:'combined'});
 const aPath=path.join(outArg,'kick-triangle-only.wav');
 const bPath=path.join(outArg,'kick-triangle-plus-noise.wav');
 writeFileSync(aPath,Buffer.from(triangleOnly));
 writeFileSync(bPath,Buffer.from(combined));
 const hat=renderKick(e,{
  wave:'noise+triangle',
  label:'hat',
  voiceOverride:{
   wave:'noise+triangle',
   attack:0,decay:0.36,sustain:0,release:0.1,pulse:50,
   pitchEnvelope:{enabled:false,interpolation:'linear',end:'hold',points:[{ms:0,semitones:0}]},
  },
  note:70,
  ms:450,
 });
 const hatPath=path.join(outArg,'hat-noise-plus-triangle.wav');
 writeFileSync(hatPath,Buffer.from(hat));
 console.log('Wrote',aPath);
 console.log('Wrote',bPath);
 console.log('Wrote',hatPath);
}

main().catch(err=>{console.error(err);process.exit(1)});