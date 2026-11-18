import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {needsAudioResume} from '../src/sid-note-gate.js';

const source=readFileSync(new URL('../src/keyboard-input.js',import.meta.url),'utf8')
 .replace(/^import .*\n/gm,'')
 .replace(/^export /gm,'');

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
 const scope=vm.createContext({
  needsAudioResume,
  countHeldResolvingTo:(held,resolve,resolved)=>{let c=0;for(const p of held)if(resolve(p)===resolved)c++;return c},
  performance:{now:()=>0},
  matchMedia:()=>({matches:false})
 });
 vm.runInContext(source,scope);
 const gesture=scope.createKeyGesture({
  audioTiming,
  sidEventLog:{enabled:false,add(){}},
  getSidContext:()=>context,
  sidMusicalInputBlocked:()=>false,
  armSidResume(){resumeCalls++},
  hasController:()=>true,
  countKeyPress(){},
  activeNotes:()=>[],
  arp:{held:new Set(),latched:new Set()},
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
