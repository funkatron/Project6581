import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFirstEnergyTiming} from '../src/audio-timing-metrics.js';

test('first-energy estimate adds quantum remainder and browser output latency',()=>{
 const audioTiming={keyAt:100,keyEnergyMs:null,keyBufferRemainderMs:null,keyToOutputEstimateMs:null,
  keyEnergyMissed:false,outputMs:12};
 const context={sampleRate:48000,outputLatency:.02};
 applyFirstEnergyTiming(audioTiming,{hit:true,sampleOffset:96,frames:128,sampleRate:48000},context,110);
 assert.equal(audioTiming.keyEnergyMs,10);
 assert.equal(audioTiming.keyBufferRemainderMs,(128-96)*1000/48000);
 assert.equal(audioTiming.keyToOutputEstimateMs,10+(128-96)*1000/48000+20);
 assert.equal(audioTiming.keyAt,null);
 assert.equal(audioTiming.keyEnergyMissed,false);
});

test('missed energy clears synthesis and output estimates',()=>{
 const audioTiming={keyAt:50,keyEnergyMs:1,keyToOutputEstimateMs:99,keyEnergyMissed:false};
 audioTiming.keyAt=50;
 applyFirstEnergyTiming(audioTiming,{hit:false},null,200);
 assert.equal(audioTiming.keyEnergyMs,null);
 assert.equal(audioTiming.keyToOutputEstimateMs,null);
 assert.equal(audioTiming.keyEnergyMissed,true);
});