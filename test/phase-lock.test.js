import test from 'node:test';
import assert from 'node:assert/strict';
import {createGridTimer} from '../src/grid-timer.js';
import {mountPerformance} from '../src/performance-play.js';
import {mountDrumPerformance} from '../src/drum-performance.js';
import {createTransportState,phaseLocked} from '../src/transport-state.js';
import {sequenceForStyle} from '../src/game-step-sequencer.js';
import {fakeDom,installFakeDocument,fakeClock} from './fixtures/fake-dom.mjs';

const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

test('delayToGrid: next grid step at least the given delay away, never before the first step',()=>{
 const clock=fakeClock();
 const timer=createGridTimer(clock);
 assert.equal(timer.delayToGrid(),null,'stopped');
 timer.start({ms:125,onStep(){}});
 clock.advance(310);
 assert.equal(timer.delayToGrid(0),65);
 assert.equal(timer.delayToGrid(50),65);
 assert.equal(timer.delayToGrid(70),190);
 clock.advance(65); // exactly on a step
 assert.equal(timer.delayToGrid(0),0);
 timer.start({ms:100,delayMs:80,onStep(){}});
 assert.equal(timer.delayToGrid(0),80,'a delayed start: its first step, not one before it');
 assert.equal(timer.delayToGrid(90),180);
});

test('phaseLocked only when the drums and the arps both follow the master BPM',()=>{
 const transport=createTransportState();
 assert.equal(phaseLocked(transport.getState()),true);
 transport.set({drum:{sync:false}});
 assert.equal(phaseLocked(transport.getState()),false);
 transport.set({drum:{sync:true},arp:{sync:false}});
 assert.equal(phaseLocked(transport.getState()),false);
});

/** Both real modules on one fake clock, wired as in sid-studio.js. */
function rig({patch={},held=[],root=false,worklet=null}={}){
 const restoreDocument=installFakeDocument();
 const clock=fakeClock();
 const saved={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 globalThis.setTimeout=(fn,delay)=>clock.setTimer(fn,delay);
 globalThis.clearTimeout=id=>clock.clearTimer(id);
 const transport=createTransportState();
 transport.set({masterBpm:120,game:{rate:4},drum:{rate:4},...patch,notes:{held}});
 const {$}=fakeDom({gameArpStyle:{value:'custom',selectedOptions:[{text:'Custom'}]}});
 const notes=[],drumSteps=[];
 const drum={step:0,timer:null,running:false,worklet:false};
 let drumApi=null,activeSeqStep=-1;
 const perf=mountPerformance({
  $,names:NAMES,keyboardState:{octave:3},
  arp:{step:0,root:null,timer:null,last:null},game:{step:0,timer:null,last:null,gateTimer:null},
  directOwned:new Set(),
  play:(note,source)=>notes.push([source,note,clock.now()]),stop:()=>{},
  silenceSidOutput(){},refreshPresetDirty(){},getArpKeyVisual:()=>({show(){},clear(){}}),
  gameEnabled:()=>true,arpEnabled:()=>root,
  activeNotes:()=>transport.activeNotes(),arpNotes:()=>transport.arpNotes(),
  latchOn:()=>false,isSeqPreview:()=>false,setSeqPreview(){},
  getActiveSeqStep:()=>activeSeqStep,setActiveSeqStep:value=>{activeSeqStep=value},
  performanceArp:{set(){}},transport,workletGenerators:worklet,
  drumGrid:()=>phaseLocked(transport.getState())?drumApi.drumGrid():null,
  ...clock
 });
 transport.setSequence(sequenceForStyle('action'));perf.renderSequenceSteps();
 drumApi=mountDrumPerformance({
  $,drum,transport,triggerDrumStep:()=>drumSteps.push(clock.now()),stopDrumVoices(){},
  arpGrid:()=>phaseLocked(transport.getState())?perf.generatorGrid():null,
  ...clock
 });
 const done=()=>{Object.assign(globalThis,saved);restoreDocument()};
 return {clock,transport,perf,drumApi,notes,drumSteps,done};
}

test('page timers: an arp started while the drums run waits for the next drum step',()=>{
 const r=rig();
 try{
  r.drumApi.drumStart();
  r.clock.advance(310);
  r.transport.set({notes:{held:[60]}});r.perf.restartGenerators();
  r.clock.advance(1000);
  const times=r.notes.map(note=>note[2]);
  assert.ok(times.length>=4,'the Game Arp played');
  assert.equal(times[0],375,'first Game step on the next drum step');
  for(const at of times)assert.equal(at%125,0,'Game step at '+at+' ms is on the drum grid');
  assert.ok(times.every(at=>r.drumSteps.includes(at)),'every Game step coincides with a drum step');
 }finally{r.done()}
});

test('page timers: drums on their own BPM are not locked',()=>{
 const r=rig({patch:{drum:{rate:4,sync:false,localBpm:120}}});
 try{
  r.drumApi.drumStart();
  r.clock.advance(310);
  r.transport.set({notes:{held:[60]}});r.perf.restartGenerators();
  r.clock.advance(10);
  assert.equal(r.notes[0][2],310,'starts at once, as before');
 }finally{r.done()}
});

test('page timers: drums started while the Game Arp runs wait for its next step',()=>{
 const r=rig({held:[60],root:true});
 try{
  r.perf.restartGenerators();
  r.clock.advance(190);
  r.drumApi.drumStart();
  r.clock.advance(1000);
  assert.equal(r.drumSteps[0],250);
  for(const at of r.drumSteps)assert.equal(at%125,0,'drum step at '+at+' ms is on the Game grid');
 }finally{r.done()}
});

test('page timers: a drum tempo restart follows the running arp grid',()=>{
 const r=rig({held:[60]});
 try{
  r.perf.restartGenerators();
  r.drumApi.drumStart();
  r.clock.advance(330);
  r.drumApi.drumRestartIfRunning();
  r.clock.advance(400);
  const after=r.drumSteps.filter(at=>at>330);
  assert.equal(after[0],375);
  for(const at of after)assert.equal(at%125,0);
 }finally{r.done()}
});

test('worklet Game Arp: the run starts on the first drum step at least the lead away',()=>{
 const runs=[];
 const worklet={leadMs:50,active:()=>true,run:({delayMs})=>{runs.push(delayMs);return runs.length},sync(){},stop(){}};
 const r=rig({worklet});
 try{
  r.drumApi.drumStart();
  r.clock.advance(310);
  r.transport.set({notes:{held:[60]}});r.perf.restartGenerators();
  r.clock.advance(30);
  r.perf.restartGenerators();
  assert.deepEqual(runs,[65,160],'310 → 375 ms (65 ≥ lead); 340 → 375 is under the lead, so 500');
 }finally{r.done()}
});
