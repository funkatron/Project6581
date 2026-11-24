import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPerformance} from '../src/performance-play.js';
import {mountDrumPerformance} from '../src/drum-performance.js';
import {createKeyGesture} from '../src/keyboard-input.js';
import {createTransportState} from '../src/transport-state.js';
import {defaultSequence} from '../src/game-step-sequencer.js';
import {defaultDrumSequence} from '../src/drum-step-sequencer.js';
import {fakeDom,installFakeDocument,recordTimers} from './fixtures/fake-dom.mjs';

// Playback reads tempo, rates, Root Arp order, the Game Arp phrase, latch and held
// notes from transport-state, not the DOM.
// Each harness seeds the DOM with values that disagree with the transport, so a
// stray DOM read fails the test.
const MISLEADING_DOM={
 masterBpm:{value:'40'},arpBpm:{value:'40'},arpSync:{checked:false},
 arpRate:{value:'0.25'},gameRate:{value:'0.25'},arpPattern:{value:'random'},arpLatch:{checked:false},
 gameArpStyle:{value:'custom',selectedOptions:[{text:'Custom'}]}
};

function mountPlay({transportPatch={},held=[60,64,67],game=false,root=false,seq=defaultSequence(),latch=false,directOwned=new Set(),restart=true}={}){
 const restoreDocument=installFakeDocument();
 const timers=recordTimers();
 const {$}=fakeDom(MISLEADING_DOM);
 const transport=createTransportState();
 transport.set({...transportPatch,arp:{...transportPatch.arp,latch},notes:{held}});
 const arpState={step:0,root:null,timer:null,last:null};
 const gameState={step:0,timer:null,last:null,gateTimer:null};
 const plays=[];
 let seqPreview=false,activeSeqStep=-1,latchOn=latch;
 let api;
 try{
  api=mountPerformance({
   $,names:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],keyboardState:{octave:3},
   arp:arpState,game:gameState,directOwned,
   play:(note,source)=>plays.push([note,source]),stop:()=>{},silenceSidOutput:()=>{},refreshPresetDirty:()=>{},
   getArpKeyVisual:()=>({show:()=>{},clear:()=>{}}),
   gameEnabled:()=>game,arpEnabled:()=>root,
   activeNotes:()=>transport.activeNotes(),arpNotes:()=>transport.activeNotes().sort((a,b)=>a-b),
   latchOn:()=>latchOn,
   isSeqPreview:()=>seqPreview,setSeqPreview:value=>{seqPreview=value},
   getActiveSeqStep:()=>activeSeqStep,setActiveSeqStep:value=>{activeSeqStep=value},
   performanceArp:{set:()=>{}},transport
  });
  // mountPerformance loads the selected built-in phrase; tests start from `seq`.
  transport.setSequence(seq);
  api.renderSequenceSteps();
  timers.intervals.length=0;timers.timeouts.length=0;
  if(restart)api.restartGenerators();
 }finally{
  timers.restore();restoreDocument();
 }
 return {api,timers,plays,arpState,gameState,transport,$,setLatch:value=>{latchOn=value}};
}

test('Root Arp and Game Arp timers use independent transport rates',()=>{
 const {timers}=mountPlay({root:true,game:true,transportPatch:{masterBpm:120,arp:{rate:2,sync:true},game:{rate:4}}});
 assert.deepEqual(timers.intervals.map(t=>t.ms),[250,125]);
});

test('arp clocks follow the local Arp BPM when Sync is off',()=>{
 const {timers}=mountPlay({root:true,transportPatch:{masterBpm:200,arp:{rate:1,sync:false,localBpm:60}}});
 assert.deepEqual(timers.intervals.map(t=>t.ms),[1000]);
});

test('Root Arp order comes from the transport',()=>{
 const {plays}=mountPlay({root:true,held:[60,64,67],transportPatch:{arp:{pattern:'down'}}});
 assert.deepEqual(plays,[[67,'arp']]);
});

test('high-rate Game Arp gates have no artificial 20 ms minimum',()=>{
 const seq=defaultSequence();
 seq.steps[0]={...seq.steps[0],gate:true,duration:25};
 const {timers,plays}=mountPlay({game:true,seq,transportPatch:{masterBpm:240,arp:{sync:true},game:{rate:32}}});
 assert.equal(plays.length,1);
 assert.equal(timers.timeouts.length,1);
 assert.ok(Math.abs(timers.timeouts[0].ms-60000/240/32*0.25)<1e-9,'~1.95 ms quarter gate');
});

test('releasing the Root Arp root reselects with the transport order and adds no tick',()=>{
 const arp={step:0,root:67,timer:null,last:null};
 const transport=createTransportState();
 transport.set({arp:{pattern:'down'},notes:{held:[60,64,67]}});
 let restarts=0;
 const gesture=createKeyGesture({
  audioTiming:{},sidEventLog:{enabled:false,add:()=>{}},
  getSidContext:()=>({state:'running'}),sidMusicalInputBlocked:()=>false,
  armSidResume:()=>{},hasController:()=>true,countKeyPress:()=>{},
  activeNotes:()=>transport.activeNotes(),arp,game:{step:0,timer:null,last:null,gateTimer:null},
  gameEnabled:()=>false,arpEnabled:()=>true,latchOn:()=>false,directOwned:new Set(),
  play:()=>{},stop:()=>{},restartGenerators:()=>{restarts++},stopGenerators:()=>{},
  gameRestart:()=>{},arpStopVoice:()=>{},arpNotes:()=>transport.held,
  isSeqPreview:()=>false,performanceNote:note=>note,
  $:fakeDom(MISLEADING_DOM).$,transport
 });
 gesture.keyUp(67);
 assert.equal(arp.root,64);
 assert.equal(restarts,0);
});

test('drum clock uses transport rate and master BPM',()=>{
 const {$}=fakeDom({drumRate:{value:'0.25'},drumSync:{checked:false},drumBpm:{value:'40'}});
 const transport=createTransportState();
 transport.set({masterBpm:150,drum:{rate:4,sync:true}});
 const drum={step:0,timer:null,running:false};
 const timers=recordTimers();
 let api;
 try{
  api=mountDrumPerformance({
   $,drum,getDrumSequence:()=>defaultDrumSequence(),transport,
   triggerDrumStep:()=>{},stopDrumVoices:()=>{}
  });
  api.drumStart();
  transport.set({drum:{sync:false,localBpm:60,rate:2}});
  $('drumRate').dispatch('change');
 }finally{timers.restore()}
 assert.deepEqual(timers.intervals.map(t=>t.ms),[100,500]);
 assert.match($('drumStatus').textContent,/60 BPM · 1\/8/);
});

test('mountDrumPerformance requires a transport',()=>{
 assert.throws(()=>mountDrumPerformance({$:fakeDom().$,drum:{}}),/requires transport/);
});

test('Game Arp plays the transport phrase and updates the Root Arp root only on a phrase boundary',()=>{
 const seq=defaultSequence();
 seq.length=4;
 seq.steps[0]={offset:12,gate:true,duration:100};
 const {plays,arpState,gameState,timers,transport}=mountPlay({root:true,game:true,held:[60,64],seq,transportPatch:{arp:{pattern:'up'}}});
 // First arp tick sets the root; the Game Arp voices root+12 on step 1.
 assert.equal(arpState.root,60);
 assert.deepEqual(plays,[[72,'game']]);
 const [arpTick]=timers.intervals;
 const saved=recordTimers();
 try{
  arpTick.fn(); // game.step 1: mid-phrase, root holds
  assert.equal(arpState.root,60);
  gameState.step=4;arpTick.fn(); // phrase boundary: root follows the arp
  assert.equal(arpState.root,60,'up order wraps back to 60 on the third tick');
  gameState.step=8;arpTick.fn();
  assert.equal(arpState.root,64);
 }finally{saved.restore()}
 assert.equal(transport.sequence.length,4);
});

test('step editor writes pitch, gate and length edits to the transport phrase',()=>{
 const {$,transport}=mountPlay({restart:false});
 const cell=$('seqGrid').children[2];
 const [,pitchWrap,gate,lengthWrap]=cell.children;
 const pitch=pitchWrap.children[0],length=lengthWrap.children[0];
 pitch.value='7';pitch.dispatch('input');
 gate.dispatch('click');
 length.value='40';length.dispatch('input');
 assert.deepEqual(transport.sequence.steps[2],{offset:7,gate:false,duration:40});
 assert.equal($('gameArpStyle').value,'custom');
 assert.equal(gate.getAttribute('aria-pressed'),'false');
 $('seqLength').value='8';
 const timers=recordTimers(),restoreDocument=installFakeDocument();
 try{$('seqLength').dispatch('change')}finally{timers.restore();restoreDocument()}
 assert.equal(transport.sequence.length,8);
});

test('Latch on keeps held keys; Latch off clears the latched set',()=>{
 const {$,transport,setLatch}=mountPlay({root:true,held:[60,64],restart:false});
 setLatch(true);
 const timers=recordTimers();
 try{
  $('arpLatch').dispatch('change');
  assert.equal(transport.arp.latch,true);
  assert.deepEqual(transport.latched,[60,64]);
  setLatch(false);
  $('arpLatch').dispatch('change');
 }finally{timers.restore()}
 assert.equal(transport.arp.latch,false);
 assert.deepEqual(transport.latched,[]);
 assert.deepEqual(transport.held,[60,64]);
});

// With an arp running, the restart after Clear releases direct notes by design;
// this covers the arps-off case where Clear must touch only the latched set.
test('clear latch preserves physical keys and direct notes',()=>{
 const directOwned=new Set([48]);
 const {$,transport}=mountPlay({held:[60],latch:true,directOwned,restart:false});
 transport.set({notes:{latched:[60,67]}});
 const timers=recordTimers();
 try{$('arpClear').dispatch('click')}finally{timers.restore()}
 assert.deepEqual(transport.latched,[]);
 assert.deepEqual(transport.held,[60]);
 assert.deepEqual([...directOwned],[48]);
 assert.equal($('arpStatus').textContent,'Latch cleared');
});

test('turning both arps off returns held keys to direct sound and drops the latch',()=>{
 const directOwned=new Set();
 const {api,plays,transport}=mountPlay({held:[60,64],latch:true,directOwned,restart:false});
 transport.set({notes:{latched:[72]}});
 const timers=recordTimers();
 try{api.restartGenerators()}finally{timers.restore()}
 assert.deepEqual(plays,[[60,undefined],[64,undefined]]);
 assert.deepEqual([...directOwned],[60,64]);
 assert.deepEqual(transport.latched,[]);
});

test('Stop on the step sequencer clears held and latched notes',()=>{
 const {$,transport}=mountPlay({game:true,held:[60],restart:false});
 transport.set({notes:{latched:[60]}});
 const timers=recordTimers();
 try{$('seqStop').dispatch('click')}finally{timers.restore()}
 assert.deepEqual(transport.getState().notes,{held:[],latched:[]});
});

test('latching key presses: first key of a new chord replaces the latched set',()=>{
 const arp={step:0,root:null,timer:null,last:null};
 const transport=createTransportState();
 transport.set({arp:{latch:true}});
 const gesture=createKeyGesture({
  audioTiming:{},sidEventLog:{enabled:false,add:()=>{}},
  getSidContext:()=>({state:'running'}),sidMusicalInputBlocked:()=>false,
  armSidResume:()=>{},hasController:()=>false,countKeyPress:()=>{},
  activeNotes:()=>transport.activeNotes(),arp,game:{step:0,timer:{},last:null,gateTimer:null},
  gameEnabled:()=>false,arpEnabled:()=>true,latchOn:()=>transport.arp.latch,directOwned:new Set(),
  play:()=>{},stop:()=>{},restartGenerators:()=>{},stopGenerators:()=>{},
  gameRestart:()=>{},arpStopVoice:()=>{},arpNotes:()=>transport.activeNotes(),
  isSeqPreview:()=>false,performanceNote:note=>note,$:fakeDom().$,transport
 });
 gesture.keyDown(60);gesture.keyDown(64);
 gesture.keyUp(60);gesture.keyUp(64);
 assert.deepEqual(transport.held,[]);
 assert.deepEqual(transport.latched,[60,64]);
 assert.deepEqual(transport.activeNotes(),[60,64]);
 gesture.keyDown(67);
 assert.deepEqual(transport.latched,[67]);
});
