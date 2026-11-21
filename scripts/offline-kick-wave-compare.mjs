#!/usr/bin/env node
/**
 * Offline reSIDfp kick A/B: triangle vs triangle+noise (6581 combined waveform).
 * Each hit uses a fresh sid_reset (reSIDfp does not retrigger cleanly on SID 4).
 *
 *   node scripts/offline-kick-wave-compare.mjs [--out DIR]
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SidRegisters, midiHz, freqRegister, PAL_CLOCK} from '../src/sid-registers.js';
import {encodeWav} from '../src/wav-encoder.js';
import {pitchOffsetAt} from '../src/pitch-envelope.js';
import {filterRegistersFromUi} from '../src/sid-filter-ui.js';
import {drumEngineFilterRegisters} from '../src/drum-engine-filter.js';
import {drumBusVolumeForLane} from '../src/drum-lane-trigger.js';
import {defaultDrumKit} from '../src/drum-step-sequencer.js';
import {defaultDrumEngineSettings} from '../src/sid-engines.js';
import {verifyListeningKickWav} from '../src/offline-wav-verify.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DRUM_CHIP=3;
const SAMPLE_RATE=48000;
const BLOCK=128;
const KICK_NOTE=36;
const PRE_ROLL_MS=200;
const HITS=4;
const GAP_MS=420;
const DISCARD_BLOCKS=64;

const LISTENING_KICK_PITCH={
 enabled:true,interpolation:'curve',end:'hold',
 points:[{ms:0,semitones:0},{ms:45,semitones:-10},{ms:200,semitones:-5}],
};

const kickVoice={
 wave:'triangle+noise',
 attack:0,decay:0.28,sustain:0,release:0.05,pulse:50,
 pitchEnvelope:LISTENING_KICK_PITCH,
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
 return drumEngineFilterRegisters(filterRegistersFromUi({
  ...engine.filter,
  volume,
 }));
}

function readMonoPcm(exports,frames){
 const ptr=exports.sid_pcm_ptr();
 const stereo=new Int16Array(exports.memory.buffer,ptr,frames*2);
 const mono=new Int16Array(frames);
 for(let i=0;i<frames;i++)mono[i]=stereo[i*2];
 return mono;
}

function discardRenderedWarmup(exports,blocks=DISCARD_BLOCKS){
 for(let i=0;i<blocks;i++)exports.sid_render(BLOCK);
}

function digitalSilenceMs(ms){
 return new Int16Array(Math.max(0,Math.round((ms/1000)*SAMPLE_RATE)));
}

function renderEngineFrames(exports,frameCount){
 const chunks=[];
 let left=frameCount;
 while(left>0){
  const n=Math.min(BLOCK,left);
  if(exports.sid_render(n)!==n)throw Error('sid_render failed');
  chunks.push(readMonoPcm(exports,n));
  left-=n;
 }
 return chunks;
}

function renderSingleHit(exports,{wave,voiceOverride=null,note=KICK_NOTE}){
 if(exports.sid_reset)exports.sid_reset();
 discardRenderedWarmup(exports);
 if(exports.sid_set_chip_gain)exports.sid_set_chip_gain(DRUM_CHIP,18);
 if(exports.sid_set_pan)exports.sid_set_pan(DRUM_CHIP,0);
 const write=(reg,val)=>exports.sid_write(reg,val);
 const sid=chipRegs(write);
 const voice=voiceOverride??{...kickVoice,wave};
 const filter=busFilterRegs();
 sid.setFilter(filter);
 sid.noteOn(0,note,voice);
 const chunks=[];
 const bodyMs=520;
 let elapsedMs=0;
 while(elapsedMs<bodyMs){
  const semis=pitchOffsetAt(voice.pitchEnvelope,elapsedMs);
  const pitched=note+semis;
  const freq=freqRegister(midiHz(pitched),PAL_CLOCK);
  write(DRUM_CHIP*0x20,freq&255);
  write(DRUM_CHIP*0x20+1,freq>>8);
  chunks.push(...renderEngineFrames(exports,BLOCK));
  elapsedMs+=BLOCK/SAMPLE_RATE*1000;
 }
 sid.noteOff(0);
 chunks.push(...renderEngineFrames(exports,Math.round(0.32*SAMPLE_RATE)));
 return chunks;
}

function renderKickHits(exports,{wave,voiceOverride=null,note=KICK_NOTE,hits=HITS}){
 const chunks=[digitalSilenceMs(PRE_ROLL_MS)];
 for(let h=0;h<hits;h++){
  if(h>0)chunks.push(digitalSilenceMs(GAP_MS));
  chunks.push(...renderSingleHit(exports,{wave,voiceOverride,note}));
 }
 return encodeWav(chunks,SAMPLE_RATE);
}

function renderHatHits(exports){
 return renderKickHits(exports,{
  hits:6,
  note:70,
  voiceOverride:{
   wave:'noise+triangle',
   attack:0,decay:0.22,sustain:0,release:0.08,pulse:50,
   pitchEnvelope:{enabled:false,interpolation:'linear',end:'hold',points:[{ms:0,semitones:0}]},
  },
 });
}

async function main(){
 const outArg=process.argv.includes('--out')?path.resolve(process.argv[process.argv.indexOf('--out')+1])
  :path.join(root,'docs/listening-samples/combined-wave');
 mkdirSync(outArg,{recursive:true});
 const {exports:e}=await loadWasm();
 e._initialize?.();
 if(e.sid_init(6581,SAMPLE_RATE)!==1)throw Error('sid_init failed');
 const triangleOnly=renderKickHits(e,{wave:'triangle'});
 const combined=renderKickHits(e,{wave:'triangle+noise'});
 const hat=renderHatHits(e);
 const reports={
  triangle:verifyListeningKickWav(triangleOnly,{minHits:4}),
  combined:verifyListeningKickWav(combined,{minHits:4}),
  hat:verifyListeningKickWav(hat,{minHits:4,minHitPeakInt16:500}),
 };
 const aPath=path.join(outArg,'kick-triangle-only.wav');
 const bPath=path.join(outArg,'kick-triangle-plus-noise.wav');
 const hatPath=path.join(outArg,'hat-noise-plus-triangle.wav');
 writeFileSync(aPath,Buffer.from(triangleOnly));
 writeFileSync(bPath,Buffer.from(combined));
 writeFileSync(hatPath,Buffer.from(hat));
 console.log(JSON.stringify({aPath,bPath,hatPath,reports},null,2));
}

main().catch(err=>{console.error(err);process.exit(1)});