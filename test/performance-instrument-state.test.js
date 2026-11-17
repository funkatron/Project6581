import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceInstrumentState} from '../src/performance-instrument-state.js';

function mockInstrumentControls(initial={voiceCount:1,unisonCount:1,mode:'mono',detune:12}){
  const els={};
  for(const [field,id] of Object.entries({voiceCount:'voiceCount',unisonCount:'unisonCount',mode:'voiceAssign',detune:'detune'})){
    els[id]={value:String(initial[field]),listeners:[],dispatchEvent(){for(const fn of this.listeners)fn()}};
    els[id].addEventListener=(type,fn)=>{if(type==='change'||type==='input')els[id].listeners.push(fn)};
  }
  els.detuneValue={textContent:''};
  const $=id=>id==='detuneValue'?els.detuneValue:els[id];
  return {$,els};
}

test('createPerformanceInstrumentState mirrors controls and clamps unison',()=>{
  const {$}=mockInstrumentControls({voiceCount:6,unisonCount:2,mode:'poly',detune:8});
  let n=0;
  const instrument=createPerformanceInstrumentState($,{onChange:()=>n++,formatDetune:v=>v+'¢'});
  assert.equal(instrument.voiceCount,6);
  assert.equal(instrument.set({voiceCount:3,unisonCount:9}),true);
  assert.equal(instrument.unisonCount,3);
  assert.equal($('voiceCount').value,'3');
  assert.ok(n>=1);
});

test('applyFromPreset restores instrument block',()=>{
  const {$}=mockInstrumentControls();
  const instrument=createPerformanceInstrumentState($);
  instrument.applyFromPreset({voiceCount:4,unisonCount:2,mode:'legato',detune:20});
  assert.deepEqual(instrument.getState(),{voiceCount:4,unisonCount:2,mode:'legato',detune:20});
});