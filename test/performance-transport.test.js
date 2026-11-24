import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPerformance} from '../src/performance-play.js';
import {mountDrumPerformance} from '../src/drum-performance.js';
import {createKeyGesture} from '../src/keyboard-input.js';
import {createTransportState} from '../src/transport-state.js';
import {defaultSequence} from '../src/game-step-sequencer.js';
import {defaultDrumSequence} from '../src/drum-step-sequencer.js';
import {fakeDom,installFakeDocument,recordTimers} from './fixtures/fake-dom.mjs';

// Playback reads tempo, rates and Root Arp order from transport-state, not the DOM.
// Each harness seeds the DOM with values that disagree with the transport, so a
// stray DOM read fails the test.
const MISLEADING_DOM={
 masterBpm:{value:'40'},arpBpm:{value:'40'},arpSync:{checked:false},
 arpRate:{value:'0.25'},gameRate:{value:'0.25'},arpPattern:{value:'random'},
 gameArpStyle:{value:'custom',selectedOptions:[{text:'Custom'}]}
};

function mountPlay({transportPatch={},held=[60,64,67],game=false,root=false,seq=defaultSequence()}={}){
 const restoreDocument=installFakeDocument();
 const timers=recordTimers();
 const {$}=fakeDom(MISLEADING_DOM);
 const transport=createTransportState();
 transport.set(transportPatch);
 const arpState={held:new Set(held),latched:new Set(),step:0,root:null,timer:null,last:null};
 const gameState={step:0,timer:null,last:null,gateTimer:null};
 const plays=[];
 let seqState=seq,seqPreview=false,activeSeqStep=-1;
 let api;
 try{
  api=mountPerformance({
   $,names:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],keyboardState:{octave:3},
   arp:arpState,game:gameState,directOwned:new Set(),
   play:(note,source)=>plays.push([note,source]),stop:()=>{},silenceSidOutput:()=>{},refreshPresetDirty:()=>{},
   getArpKeyVisual:()=>({show:()=>{},clear:()=>{}}),
   gameEnabled:()=>game,arpEnabled:()=>root,
   activeNotes:()=>[...arpState.held],arpNotes:()=>[...arpState.held],
   getSeqState:()=>seqState,setSeqState:value=>{seqState=value},
   isSeqPreview:()=>seqPreview,setSeqPreview:value=>{seqPreview=value},
   getActiveSeqStep:()=>activeSeqStep,setActiveSeqStep:value=>{activeSeqStep=value},
   performanceArp:{set:()=>{}},transport
  });
  timers.intervals.length=0;timers.timeouts.length=0;
  api.restartGenerators();
 }finally{
  timers.restore();restoreDocument();
 }
 return {api,timers,plays,arpState,gameState};
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
 const arp={held:new Set([60,64,67]),latched:new Set(),step:0,root:67,timer:null,last:null};
 let restarts=0;
 const gesture=createKeyGesture({
  audioTiming:{},sidEventLog:{enabled:false,add:()=>{}},
  getSidContext:()=>({state:'running'}),sidMusicalInputBlocked:()=>false,
  armSidResume:()=>{},hasController:()=>true,countKeyPress:()=>{},
  activeNotes:()=>[...arp.held],arp,game:{step:0,timer:null,last:null,gateTimer:null},
  gameEnabled:()=>false,arpEnabled:()=>true,latchOn:()=>false,directOwned:new Set(),
  play:()=>{},stop:()=>{},restartGenerators:()=>{restarts++},stopGenerators:()=>{},
  gameRestart:()=>{},arpStopVoice:()=>{},arpNotes:()=>[...arp.held],
  isSeqPreview:()=>false,performanceNote:note=>note,
  $:fakeDom(MISLEADING_DOM).$,
  getArpPattern:()=>'down'
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
