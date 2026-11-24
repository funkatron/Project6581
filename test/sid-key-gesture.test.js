import test from 'node:test';
import assert from 'node:assert/strict';
import {createKeyGesture} from '../src/keyboard-input.js';
import {createTransportState} from '../src/transport-state.js';

function harness({state}){
 const played=[];
 let resumeCalls=0;
 const elements=new Map();
 const $=id=>{
  if(!elements.has(id))elements.set(id,{textContent:'',checked:false,value:'up'});
  return elements.get(id);
 };
 const context={state};
 const audioTiming={keyAt:null,keyEnergyMs:null,keyEnergyMissed:false};
 const gesture=createKeyGesture({
  audioTiming,
  sidEventLog:{enabled:false,add(){}},
  getSidContext:()=>context,
  sidMusicalInputBlocked:()=>false,
  armSidResume(){resumeCalls++},
  hasController:()=>true,
  countKeyPress(){},
  activeNotes:()=>[],
  arp:{},
  transport:createTransportState(),
  game:{timer:null},
  gameEnabled:()=>false,
  arpEnabled:()=>false,
  directOwned:new Set(),
  play(note){played.push(note)},
  stop(){},
  restartGenerators(){},
  stopGenerators(){},
  gameRestart(){},
  arpStopVoice(){},
  arpNotes:()=>[],
  isSeqPreview:()=>false,
  performanceNote:note=>note,
  $
 });
 return {gesture,played,context,resumeCalls:()=>resumeCalls};
}

test('a running context plays on the same turn even if an older resume never settles',()=>{
 const h=harness({state:'running'});
 h.gesture.keyDown(60);
 assert.deepEqual(h.played,[60]);
 assert.equal(h.resumeCalls(),0);
});

test('a suspended press resumes without waiting, then plays once the context is running',()=>{
 const h=harness({state:'suspended'});
 h.gesture.keyDown(60);
 assert.deepEqual(h.played,[]);
 assert.equal(h.resumeCalls(),1);
 h.context.state='running';
 h.gesture.flushQueuedKeys();
 assert.deepEqual(h.played,[60]);
});
