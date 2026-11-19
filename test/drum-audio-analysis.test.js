import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeWav} from '../src/wav-encoder.js';
import {decodeWavMonoPcm,analyzeDrumStepWindows,evaluateDrumAudioProfile} from '../src/drum-audio-analysis.js';
import {drumSequenceFromFixture} from '../src/drum-audio-fixture.js';
import {hitsOnStep} from '../src/drum-step-sequencer.js';

const fixtureDir=new URL('./fixtures/drum-audio/',import.meta.url);

function loadJson(name){
 return JSON.parse(readFileSync(new URL(name,fixtureDir),'utf8'));
}

function synthBar({sampleRate,bpm,rate,steps,stepTone}){
 const stepMs=60000/bpm/rate;
 const stepSamples=Math.round((sampleRate*stepMs)/1000);
 const chunks=[];
 for(let step=0;step<steps;step++){
  const block=new Int16Array(stepSamples);
  const tone=stepTone(step);
  let phase=0;
  for(let i=0;i<stepSamples;i++){
   const t=i/sampleRate;
   let sample=0;
   if(tone==='noise')sample=(Math.random()*2-1)*0.6;
   else if(tone==='sine')sample=Math.sin(phase)*0.7;
   else sample=0;
   phase+=2*Math.PI*80/sampleRate;
   block[i]=Math.round(Math.max(-1,Math.min(1,sample))*32000);
  }
  chunks.push(block);
 }
 return encodeWav(chunks,sampleRate);
}

test('drum audio fixtures validate and ch-only hits every step',()=>{
 const fixture=loadJson('ch-only-16.json');
 const seq=drumSequenceFromFixture(fixture);
 assert.equal(hitsOnStep(seq,0).length,1);
 assert.equal(hitsOnStep(seq,0)[0].lane,'ch');
 assert.equal(hitsOnStep(seq,15)[0].lane,'ch');
});

test('decode and step windows split one bar at 120 BPM 1/16',()=>{
 const wav=synthBar({sampleRate:48000,bpm:120,rate:4,steps:16,stepTone:()=>'noise'});
 const {samples,sampleRate}=decodeWavMonoPcm(wav);
 const {windows,stepSamples}=analyzeDrumStepWindows({samples,sampleRate,bpm:120,rate:4,bars:1});
 assert.equal(windows.length,16);
 assert.equal(stepSamples,6000);
});

test('noise bar passes ch profile; sine low bar fails ch profile',()=>{
 const profile=loadJson('profiles/ch-only-16.json');
 const noiseWav=synthBar({sampleRate:48000,bpm:120,rate:4,steps:16,stepTone:()=>'noise'});
 const noise=evaluateDrumAudioProfile(
  analyzeDrumStepWindows({...decodeWavMonoPcm(noiseWav),bpm:120,rate:4}),
  profile,
 );
 assert.equal(noise.pass,true,noise.failures.join('; '));
 const kickProfile=loadJson('profiles/kick-four-on-floor.json');
 const lowWav=synthBar({
  sampleRate:48000,bpm:120,rate:4,steps:16,
  stepTone:step=>([0,4,8,12].includes(step)?'sine':'rest'),
 });
 const low=evaluateDrumAudioProfile(
  analyzeDrumStepWindows({...decodeWavMonoPcm(lowWav),bpm:120,rate:4}),
  kickProfile,
 );
 assert.equal(low.pass,true,low.failures.join('; '));
 const lowVsCh=evaluateDrumAudioProfile(
  analyzeDrumStepWindows({...decodeWavMonoPcm(lowWav),bpm:120,rate:4}),
  profile,
 );
 assert.equal(lowVsCh.pass,false);
});