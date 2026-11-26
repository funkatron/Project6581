import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPerformance} from '../src/performance-play.js';
import {createWorkletGameArp} from '../src/worklet-game-arp.js';
import {createTransportState,arpStepMs,gameStepMs} from '../src/transport-state.js';
import {defaultSequence,sequenceForStyle} from '../src/game-step-sequencer.js';
import {fakeDom,installFakeDocument,fakeClock} from './fixtures/fake-dom.mjs';

const RATE=48000;
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/**
 * The page's Root Arp + Game Arp (performance-play.js) on a fake clock. Gate
 * timers (global setTimeout) run on the same clock, so every play()/stop()
 * call is recorded with its time in ms.
 */
function runPage({transport,sequence,game=true,root=false,preview=false,octave=3,ms,changes=[]}){
 const restoreDocument=installFakeDocument();
 const clock=fakeClock();
 const saved={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 globalThis.setTimeout=(fn,delay)=>clock.setTimer(fn,delay);
 globalThis.clearTimeout=id=>clock.clearTimer(id);
 const calls=[];
 try{
  const {$}=fakeDom({gameArpStyle:{value:'custom',selectedOptions:[{text:'Custom'}]}});
  let activeSeqStep=-1;
  const resolve=note=>transport.resolveNote(note);
  const api=mountPerformance({
   $,names:NAMES,keyboardState:{octave},
   arp:{step:0,root:null,timer:null,last:null},game:{step:0,timer:null,last:null,gateTimer:null},
   directOwned:new Set(),performanceNote:resolve,
   play:(note,source)=>calls.push(['on',note,source,clock.now()]),
   stop:(note,source)=>calls.push(['off',note,source,clock.now()]),
   silenceSidOutput:()=>{},refreshPresetDirty:()=>{},
   getArpKeyVisual:()=>({show:()=>{},clear:()=>{}}),
   gameEnabled:()=>game,arpEnabled:()=>root,
   activeNotes:()=>transport.activeNotes(),arpNotes:()=>transport.arpNotes(),
   latchOn:()=>false,isSeqPreview:()=>preview,setSeqPreview:()=>{},
   getActiveSeqStep:()=>activeSeqStep,setActiveSeqStep:value=>{activeSeqStep=value},
   performanceArp:{set:()=>{}},transport,...clock
  });
  transport.setSequence(sequence);api.renderSequenceSteps();
  api.restartGenerators();
  let at=0;
  for(const [time,change] of changes){clock.advance(time-at);at=time;change()}
  clock.advance(ms-at);
 }finally{
  Object.assign(globalThis,saved);restoreDocument();
 }
 return calls;
}

/**
 * The worklet player on audio frames: Root steps and Game steps on one frame
 * grid (Root first when they coincide), gate-offs at their frames.
 */
function runWorklet({transport,game=true,root=false,preview=false,octave=3,ms,changes=[]}){
 const player=createWorkletGameArp({sampleRate:RATE});
 const resolve=note=>transport.resolveNote(note);
 const state=()=>transport.getState();
 const calls=[];
 const record=events=>{for(const e of events)calls.push([e.type,e.note,e.source,e.frame*1000/RATE])};
 const frameOf=time=>Math.round(time*RATE/1000);
 let gameN=0,rootN=0,gameStopped=!game;
 const pendingChanges=[...changes];
 const end=frameOf(ms);
 for(;;){
  const gameMs=gameStepMs(state()),rootMs=arpStepMs(state());
  const nextGame=gameStopped?Infinity:frameOf(gameN*gameMs);
  const nextRoot=root&&game?frameOf(rootN*rootMs):Infinity;
  const nextChange=pendingChanges.length?frameOf(pendingChanges[0][0]):Infinity;
  const next=Math.min(nextGame,nextRoot,nextChange);
  // Gates due before the next event (or the end) fire first.
  const gateAt=player.nextGateAt();
  if(gateAt!==null&&gateAt<=Math.min(next,end)){record(player.releaseDue(gateAt));continue}
  if(next>end)break;
  // A change at the same time as a step lands after it (the page's clock.advance order).
  if(nextChange<Math.min(nextGame,nextRoot)){pendingChanges.shift()[1]();continue}
  if(next===nextRoot){
   player.rootStep({notes:transport.arpNotes(),pattern:state().arp.pattern,phraseLength:transport.sequence.length,resolve});
   rootN++;continue;
  }
  const result=player.gameStep({frame:next,stepFrames:gameMs*RATE/1000,arpEnabled:root,
   heldNotes:transport.activeNotes(),seqPreview:preview,previewRootMidi:(octave+1)*12,
   sequence:transport.sequence,resolve});
  record(result.events);
  if(result.stop)gameStopped=true;
  gameN++;
 }
 return calls;
}

function assertParity(options){
 const page=runPage({...options,transport:options.transport()});
 const pageTransport=options.transport();
 pageTransport.setSequence(options.sequence);
 const worklet=runWorklet({...options,transport:pageTransport});
 assert.ok(page.length>=4,'the page played something: '+page.length);
 assert.equal(worklet.length,page.length,'same number of note calls');
 page.forEach((call,i)=>{
  const [type,note,source,at]=worklet[i];
  assert.deepEqual([type,note,source],call.slice(0,3),'call '+i+' at '+call[3]+' ms');
  // Frames round each time to 1/48 ms.
  assert.ok(Math.abs(at-call[3])<=0.03,'call '+i+': page '+call[3]+' ms, worklet '+at+' ms');
 });
 return page;
}

const transportWith=(patch,held=[60])=>()=>{
 const transport=createTransportState();
 transport.set({...patch,notes:{held}});
 return transport;
};

test('built-in Action phrase on a held note matches the page, note for note',()=>{
 assertParity({transport:transportWith({masterBpm:120,game:{rate:4}}),sequence:sequenceForStyle('action'),ms:4000});
});

test('custom phrase: rests, 25–100 % lengths, 8 steps, scale lock, an uneven tempo',()=>{
 const sequence=defaultSequence();
 sequence.length=8;
 const offsets=[0,3,7,-5,12,0,5,24],durations=[25,50,75,100,40,90,60,35];
 sequence.steps=sequence.steps.map((step,i)=>i<8?{offset:offsets[i],gate:i!==3&&i!==6,duration:durations[i]}:step);
 const calls=assertParity({transport:transportWith({masterBpm:133,game:{rate:4},scale:{id:'minor',tonic:2,lock:true}},[62]),sequence,ms:5000});
 assert.ok(calls.some(([type])=>type==='off'),'gate-offs exercised');
});

test('Root Arp on: it picks the root silently and the phrase changes root on its boundary',()=>{
 const calls=assertParity({transport:transportWith({masterBpm:120,arp:{rate:0.5,pattern:'up'},game:{rate:4}},[48,55,60]),
  sequence:sequenceForStyle('adventure'),root:true,ms:8000});
 const roots=new Set(calls.filter(([type])=>type==='on').map(([,note])=>note));
 assert.ok(roots.size>4,'several roots heard');
 assert.ok(calls.every(([,,source])=>source==='game'),'the Root Arp itself makes no sound');
});

test('Root at 1/2 and an 8-step phrase at 1/16: a new root every phrase',()=>{
 const sequence=defaultSequence();
 sequence.length=8;
 assertParity({transport:transportWith({masterBpm:110,arp:{rate:0.5,pattern:'updown'},game:{rate:4}},[45,52,57,60]),sequence,root:true,ms:9000});
});

test('preview with no keys plays from the keyboard octave',()=>{
 assertParity({transport:transportWith({masterBpm:126,game:{rate:2}},[]),sequence:sequenceForStyle('arcade'),preview:true,octave:4,ms:4000});
});

test('held notes change mid-run; releasing everything stops the Game Arp like the page',()=>{
 const changes=transport=>[[1010,()=>transport.set({notes:{held:[64]}})],[2333,()=>transport.set({notes:{held:[67,72]}})],[3500,()=>transport.set({notes:{held:[]}})]];
 const page=(()=>{const t=transportWith({masterBpm:120,game:{rate:4}})();t.setSequence(sequenceForStyle('action'));return runPage({transport:t,sequence:sequenceForStyle('action'),ms:5000,changes:changes(t)})})();
 const t2=transportWith({masterBpm:120,game:{rate:4}})();t2.setSequence(sequenceForStyle('action'));
 const worklet=runWorklet({transport:t2,ms:5000,changes:changes(t2)});
 assert.deepEqual(worklet.map(c=>c.slice(0,3)),page.map(c=>c.slice(0,3)));
 worklet.forEach((c,i)=>assert.ok(Math.abs(c[3]-page[i][3])<=0.03,'call '+i));
 const last=page.at(-1);
 assert.equal(last[0],'off','the last note is released');
 assert.ok(page.every(c=>c[3]<=3500+125),'nothing plays after the keys are released');
});

test('stop() releases the sounding note; reset() starts both clocks over',()=>{
 const player=createWorkletGameArp({sampleRate:RATE});
 const sequence=defaultSequence();
 const step=frame=>player.gameStep({frame,stepFrames:6000,arpEnabled:false,heldNotes:[60],seqPreview:false,previewRootMidi:48,sequence,resolve:n=>n});
 step(0);
 assert.equal(player.nextGateAt(),4500,'75 % of a 6,000-frame step');
 assert.deepEqual(player.stop(100),[{type:'off',note:60,source:'game',frame:100}]);
 assert.equal(player.nextGateAt(),null);
 assert.deepEqual(player.stop(200),[]);
 step(6000);
 assert.equal(player.gameClock.step,2);
 player.reset();
 assert.deepEqual(player.gameClock,{step:0,last:null});
 assert.deepEqual(player.rootClock,{step:0,root:null,last:null});
 assert.throws(()=>createWorkletGameArp({sampleRate:0}),RangeError);
});
