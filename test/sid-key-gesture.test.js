import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {needsAudioResume} from '../src/sid-note-gate.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const keys=html.slice(html.indexOf('let queuedKeyNotes=[]'),html.indexOf('function keyUp(note){'));
const resume=html.slice(html.indexOf('function armSidResume(){'),html.indexOf('function unlockSidAudio(){'));

function harness({state,resumeHangs=true}){
 const played=[];
 let resumeCalls=0;
 const elements=new Map();
 const $=id=>{
  if(!elements.has(id))elements.set(id,{textContent:'',checked:false});
  return elements.get(id);
 };
 const context={
  state,
  resume(){
   resumeCalls++;
   return resumeHangs?new Promise(()=>{}):Promise.resolve();
  }
 };
 const scope=vm.createContext({
  $,sidContext:context,sidContextRetired:false,sidAttempt:1,needsAudioResume,
  sidMusicalInputBlocked:()=>false,sidEventLog:{enabled:false,add(){}},
  sidController:{},sidKeys:0,sidAudio:{},activeSidModel:6581,
  activeNotes:()=>[],arp:{held:new Set(),latched:new Set()},
  gameEnabled:()=>false,arpEnabled:()=>false,directOwned:new Set(),
  play(note){played.push(note)},restartGenerators(){},
  refreshEngineStatus(){},updateSidActivation(){}
 });
 vm.runInContext(keys+'\n'+resume,scope);
 return {scope,played,context,resumeCalls:()=>resumeCalls};
}

test('a running context plays on the same turn even if an older resume never settles',()=>{
 const h=harness({state:'running'});
 h.scope.keyDown(60);
 assert.deepEqual(h.played,[60]);
 assert.equal(h.resumeCalls(),0);
});

test('a suspended press resumes without waiting, then plays once the context is running',()=>{
 const h=harness({state:'suspended'});
 h.scope.keyDown(60);
 assert.deepEqual(h.played,[]);
 assert.equal(h.resumeCalls(),1);
 h.context.state='running';
 h.scope.flushQueuedKeys();
 assert.deepEqual(h.played,[60]);
});
