#!/usr/bin/env node
/**
 * Offline kick listening WAVs (chip 0, sid_init per hit). Not SID 4 — WASM chip 3
 * is DC-only today. Combined = triangle+noise mix (0x91 is DC in Node WASM).
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SidRegisters} from '../src/sid-registers.js';
import {encodeWav} from '../src/wav-encoder.js';
import {verifyListeningKickWav} from '../src/offline-wav-verify.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SAMPLE_RATE=48000;
const BLOCK=128;
const PRE_ROLL_MS=200;
const GAP_MS=420;
const HITS=4;
const DISCARD_BLOCKS=64;
const LISTENING_GAIN=4;
const KICK_NOTE=36;

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

function digitalSilenceMs(ms){
 return new Int16Array(Math.max(0,Math.round((ms/1000)*SAMPLE_RATE)));
}

function readMono(exports,frames){
 const ptr=exports.sid_pcm_ptr();
 const stereo=new Int16Array(exports.memory.buffer,ptr,frames*2);
 const mono=new Int16Array(frames);
 for(let i=0;i<frames;i++){
  mono[i]=Math.max(-32768,Math.min(32767,Math.round(stereo[i*2]*LISTENING_GAIN)));
 }
 return mono;
}

function renderFrames(exports,frameCount){
 const chunks=[];
 let left=frameCount;
 while(left>0){
  const n=Math.min(BLOCK,left);
  if(exports.sid_render(n)!==n)throw Error('sid_render failed');
  chunks.push(readMono(exports,n));
  left-=n;
 }
 return chunks;
}

function renderLayer(exports,{wave,note,decay,bodyMs}){
 exports.sid_reset?.();
 if(exports.sid_init(6581,SAMPLE_RATE)!==1)throw Error('sid_init failed');
 for(let i=0;i<DISCARD_BLOCKS;i++)exports.sid_render(BLOCK);
 const sid=new SidRegisters((reg,val)=>exports.sid_write(reg,val));
 sid.noteOn(0,note,{
  wave,
  attack:0,
  decay,
  sustain:0,
  release:0.05,
  pulse:50,
  pitchEnvelope:{enabled:false,interpolation:'linear',end:'hold',points:[{ms:0,semitones:0}]},
 });
 return renderFrames(exports,Math.round((bodyMs/1000)*SAMPLE_RATE));
}

function mixChunks(a,b){
 const len=Math.max(a.length,b.length);
 const out=[];
 for(let i=0;i<len;i++){
  const xa=a[i]??new Int16Array(0);
  const xb=b[i]??new Int16Array(0);
  const frames=Math.max(xa.length,xb.length);
  const mix=new Int16Array(frames);
  for(let f=0;f<frames;f++){
   mix[f]=Math.max(-32768,Math.min(32767,(xa[f]??0)+(xb[f]??0)));
  }
  out.push(mix);
 }
 return out;
}

function renderKickHit(exports,wave){
 if(wave==='triangle+noise'){
  const tri=renderLayer(exports,{wave:'triangle',note:KICK_NOTE,decay:0.25,bodyMs:520});
  const noise=renderLayer(exports,{wave:'noise',note:KICK_NOTE,decay:0.22,bodyMs:480});
  return mixChunks(tri,noise);
 }
 return renderLayer(exports,{wave,note:KICK_NOTE,decay:0.25,bodyMs:520});
}

function buildSequence(exports,renderOneHit,hits=HITS){
 const stitched=[digitalSilenceMs(PRE_ROLL_MS)];
 for(let h=0;h<hits;h++){
  if(h>0)stitched.push(digitalSilenceMs(GAP_MS));
  stitched.push(...renderOneHit(exports));
 }
 return encodeWav(stitched,SAMPLE_RATE);
}

async function main(){
 const outArg=process.argv.includes('--out')?path.resolve(process.argv[process.argv.indexOf('--out')+1])
  :path.join(root,'docs/listening-samples/combined-wave');
 mkdirSync(outArg,{recursive:true});
 const {exports:e}=await loadWasm();
 e._initialize?.();
 if(e.sid_init(6581,SAMPLE_RATE)!==1)throw Error('sid_init failed');
 const triangleOnly=buildSequence(e,exp=>renderKickHit(exp,'triangle'));
 const combined=buildSequence(e,exp=>renderKickHit(exp,'triangle+noise'));
 const hat=buildSequence(e,exp=>renderLayer(exp,{wave:'noise',note:70,decay:0.18,bodyMs:380}),6);
 const verifyOpts={minHits:4,minHitPeakInt16:2000,minHitZeroCrossings:6,minHitBipolarSamples:20};
 const reports={
  triangle:verifyListeningKickWav(triangleOnly,verifyOpts),
  combined:verifyListeningKickWav(combined,verifyOpts),
  hat:verifyListeningKickWav(hat,{...verifyOpts,minHitPeakInt16:800}),
 };
 writeFileSync(path.join(outArg,'kick-triangle-only.wav'),Buffer.from(triangleOnly));
 writeFileSync(path.join(outArg,'kick-triangle-plus-noise.wav'),Buffer.from(combined));
 writeFileSync(path.join(outArg,'hat-noise-plus-triangle.wav'),Buffer.from(hat));
 console.log(JSON.stringify({outArg,reports},null,2));
}

main().catch(err=>{console.error(err);process.exit(1)});