import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeMasterPeak,mountMasterLoudnessMeter} from '../src/master-loudness-meter-ui.js';
import {readStudioCoreCss} from './studio-css.mjs';

function masterPeakWorkletHarness(){
 let Processor;
 const replies=[];
 const buffer=new ArrayBuffer(4096);
 const pcmOffset=0;
 const chipPeakOffset=256;
 const scope=vm.createContext({
  AudioWorkletProcessor:class{port={postMessage:message=>replies.push(structuredClone(message))}},
  sampleRate:48000,
  currentFrame:0,
  registerProcessor(_name,type){Processor=type}
 });
 vm.runInContext(readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8'),scope);
 const processor=new Processor();
 processor.exports={
  sid_write:()=>{},
  sid_render:frames=>frames,
  sid_pcm_ptr:()=>pcmOffset,
  sid_chip_peaks_ptr:()=>chipPeakOffset,
  memory:{buffer}
 };
 const fillStereoBlock=(left,right=left)=>{
  const pcm=new Int16Array(buffer,pcmOffset,256);
  for(let index=0;index<128;index++){
   pcm[index*2]=left;
   pcm[index*2+1]=right;
  }
 };
 const setChipPeaks=(a,b,c)=>{
  new Float32Array(buffer,chipPeakOffset,3).set([a,b,c]);
 };
 const render=()=>{
  processor.process([],[ [new Float32Array(128),new Float32Array(128)] ]);
 };
 const meterLevels=()=>replies.filter(message=>message.type==='meter-levels');
 return {fillStereoBlock,setChipPeaks,render,meterLevels,replies};
}

test('normalizeMasterPeak clamps invalid input',()=>{
 assert.equal(normalizeMasterPeak(-1),0);
 assert.equal(normalizeMasterPeak(0.42),0.42);
 assert.equal(normalizeMasterPeak(Number.NaN),0);
});

test('master loudness meter updates fill width',()=>{
 const fill={style:{width:''}};
 const root={
  setAttribute(){},
  querySelector:()=>fill
 };
 const meter=mountMasterLoudnessMeter(id=>id==='masterLoudnessMeter'?root:null);
 meter.update(0.2);
 assert.notEqual(fill.style.width,'');
 assert.match(fill.style.width,/\d+\.\d%/);
});

test('header master meter is a full-bleed horizontal rainbow bar',()=>{
 const css=readStudioCoreCss();
 assert.match(css,/\.header-meter-band \.master-rainbow-meter\{[^}]*width:100%/);
 assert.match(css,/\.header-meter-band \.master-rainbow-meter\{[^}]*height:15px/);
 assert.match(css,/\.master-rainbow-meter-fill\{[^}]*width:0/);
});

test('header includes Plus/4 style master meter markup',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="masterLoudnessMeter"/);
 assert.match(html,/master-rainbow-meter-fill/);
 assert.match(html,/class="header-meter-band"><div id="masterLoudnessMeter"/);
 assert.doesNotMatch(html,/class="statusbar"[^>]*>[\s\S]*?masterLoudnessMeter/);
});

test('worklet publishes mixed master peak with chip meter levels',()=>{
 const worklet=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 assert.match(worklet,/masterPeakHold/);
 assert.match(worklet,/masterPeak:this\.masterPeakHold/);
});

test('worklet master peak follows mixed stereo PCM and resets every 16 blocks',()=>{
 const h=masterPeakWorkletHarness();
 const block=(left,right,rounds)=>{
  h.fillStereoBlock(left,right);
  for(let count=0;count<rounds;count++)h.render();
 };
 block(0,0,15);
 assert.equal(h.meterLevels().length,0);
 block(0,32767,1);
 const first=h.meterLevels().at(-1);
 assert.ok(first);
 assert.ok(Math.abs(first.masterPeak-1)<0.001);
 assert.deepEqual(first.chipPeaks,[0,0,0]);
 block(0,0,16);
 const second=h.meterLevels().at(-1);
 assert.equal(second.masterPeak,0);
 block(16384,0,8);
 block(0,24576,8);
 const third=h.meterLevels().at(-1);
 assert.ok(Math.abs(third.masterPeak-0.75)<0.001);
});

test('worklet master peak is not replaced by low chip peak telemetry',()=>{
 const h=masterPeakWorkletHarness();
 h.setChipPeaks(0.05,0.05,0.05);
 h.fillStereoBlock(0,32767);
 for(let count=0;count<16;count++)h.render();
 const levels=h.meterLevels().at(-1);
 assert.ok(Math.abs(levels.masterPeak-1)<0.001);
 for(const chipPeak of levels.chipPeaks)
  assert.ok(chipPeak<0.2,'master peak must not come from low chip telemetry alone');
});