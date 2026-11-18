import test from 'node:test';
import assert from 'node:assert/strict';
import {createKeyGesture} from '../src/keyboard-input.js';

function makeHarness({gameOn=false,arpOn=false,latch=false,seqPreview=false}={}){
 const arp={held:new Set(),latched:new Set(),step:0,root:null,timer:null,last:null};
 const game={step:0,timer:null,last:null,gateTimer:null};
 const directOwned=new Set();
 const calls={play:[],stop:[],restart:0,stopGen:0,gameRestart:0,arpStop:0};
 const dom={arpLatch:{checked:latch},arpPattern:{value:'up'}};
 const $=id=>dom[id]??{checked:false,value:'4'};
 const gesture=createKeyGesture({
  audioTiming:{},sidEventLog:{enabled:false,add:()=>{}},
  getSidContext:()=>({state:'running'}),sidMusicalInputBlocked:()=>false,
  armSidResume:()=>{},hasController:()=>true,countKeyPress:()=>{},
  activeNotes:()=>(latch&&arp.latched.size?[...arp.latched]:[...arp.held]),
  arp,game,
  gameEnabled:()=>gameOn,arpEnabled:()=>arpOn,directOwned,
  play:(n,src)=>calls.play.push([n,src??'keyboard']),stop:n=>calls.stop.push(n),
  restartGenerators:()=>{calls.restart++},
  stopGenerators:()=>{calls.stopGen++},
  gameRestart:()=>{calls.gameRestart++},
  arpStopVoice:()=>{calls.arpStop++},
  arpNotes:()=>[...arp.held],
  isSeqPreview:()=>seqPreview,$
 });
 return {gesture,arp,calls};
}

test('mode: both off plays and releases directly',()=>{
 const {gesture,calls}=makeHarness();
 gesture.keyDown(60);
 assert.deepEqual(calls.play,[[60,'keyboard']]);
 assert.equal(calls.restart,0);
 gesture.keyUp(60);
 assert.deepEqual(calls.stop,[60]);
});

test('mode: Game Arp only starts generators without direct play',()=>{
 const {gesture,calls}=makeHarness({gameOn:true});
 gesture.keyDown(60);
 assert.equal(calls.play.length,0);
 assert.equal(calls.restart,1);
 gesture.keyUp(60);
 assert.equal(calls.stopGen,1);
});

test('mode: Root Arp only starts generators without direct play',()=>{
 const {gesture,calls}=makeHarness({arpOn:true});
 gesture.keyDown(64);
 assert.equal(calls.play.length,0);
 assert.equal(calls.restart,1);
});

test('mode: both on defers sound to generator clocks',()=>{
 const {gesture,calls}=makeHarness({gameOn:true,arpOn:true});
 gesture.keyDown(60);
 gesture.keyDown(64);
 assert.equal(calls.play.length,0);
 assert.ok(calls.restart>=1,'restarts idle arp/game timers when adding keys');
});

test('mode: Game Arp only does not restart clocks on every additional key',()=>{
 const {gesture,game,calls}=makeHarness({gameOn:true});
 gesture.keyDown(60);
 assert.equal(calls.restart,1);
 game.timer={};
 gesture.keyDown(64);
 assert.equal(calls.restart,1);
});

test('mode: last key release with latch off stops generator clocks',()=>{
 const {gesture,calls}=makeHarness({gameOn:true,arpOn:true});
 gesture.keyDown(60);
 gesture.keyUp(60);
 assert.equal(calls.stopGen,1);
});