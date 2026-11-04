import test from 'node:test';
import assert from 'node:assert/strict';
import {modulationTrack,formatControlValue,SLIDER_TARGETS} from '../src/modulation-track.js';

test('center stays at editable base while track spans signed effective modulation',()=>{
 const above=modulationTrack(50,75,0,100,true);
 assert.deepEqual(above,{center:'50%',start:'50%',end:'75%',active:true});
 const below=modulationTrack(50,25,0,100,true);
 assert.deepEqual(below,{center:'50%',start:'25%',end:'50%',active:true});
 assert.equal(modulationTrack(50,95,0,100,true).center,above.center);
});

test('clipped values, reversed movement, and disabled LFOs are safe',()=>{
 assert.deepEqual(modulationTrack(100,120,0,100,true),{
  center:'100%',start:'100%',end:'100%',active:false
 });
 assert.deepEqual(modulationTrack(-10,-50,0,100,true),{
  center:'0%',start:'0%',end:'0%',active:false
 });
 assert.deepEqual(modulationTrack(70,30,0,100,false),{
  center:'70%',start:'30%',end:'70%',active:false
 });
 assert.equal(modulationTrack(0.12,0.2,.01,4,true).active,true);
});

test('nonzero slider minima, zero-length and nonfinite values',()=>{
 const r=modulationTrack(50,100,50,10000,true);
 assert.equal(r.center,'0%');
 assert.ok(r.active);
 for(const args of [[0,1,0,0,true],[0,1,10,0,true],[0,Infinity,0,100,true],
                    [NaN,20,0,100,true],[0,30,NaN,100,true]]) {
  assert.throws(()=>modulationTrack(...args),RangeError);
 }
});

test('all eleven continuous controls have legible persistent base and effective values',()=>{
 assert.equal(SLIDER_TARGETS.length,11);
 assert.equal(formatControlValue('cutoff',6800.4),'6800 Hz');
 assert.equal(formatControlValue('volume',55.1),'55%');
 assert.equal(formatControlValue('resonance',10),'10%');
 assert.equal(formatControlValue('detune',12),'12¢');
 assert.equal(formatControlValue('detune',12.5),'12.5¢');
 assert.equal(formatControlValue('attack',.002),'0.00 s');
 assert.equal(formatControlValue('decay',.12),'0.12 s');
 assert.equal(formatControlValue('sustain',.8),'80%');
 assert.equal(formatControlValue('release',.12),'0.12 s');
 assert.equal(formatControlValue('pulse',50),'50%');
 assert.equal(formatControlValue('pwmDepth',12),'12%');
 assert.equal(formatControlValue('pwmRate',1.25),'1.25 Hz');
});
