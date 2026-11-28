import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {mountPerformance} from '../src/performance-play.js';
import {createWorkletGenerators,GENERATORS_MESSAGE} from '../src/worklet-generators.js';
import {createTransportState} from '../src/transport-state.js';
import {defaultSequence,sequenceForStyle} from '../src/game-step-sequencer.js';
import {selectRoot} from '../src/arp-composition.js';
import {routeMask,routingKeyForSource,dispatchUsesLayer,DEFAULT_ROUTING} from '../src/sid-engines.js';
import {canDispatchNote,shouldBlockMusicalInput,needsAudioResume} from '../src/sid-note-gate.js';
import {fakeDom,installFakeDocument,fakeClock} from './fixtures/fake-dom.mjs';
import {createKeyGesture} from '../src/keyboard-input.js';
import {workletGameArpTimingStatus,workletGeneratorsSupported,mountWorkletGameArpTimingPref,WORKLET_GAME_ARP_TIMING_KEY} from '../src/studio-preferences-ui.js';
import {formatWorkletGameArp} from '../src/audio-timing-panel.js';
import {createNoteControllerProxy} from '../src/worklet-note-controller.js';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';
import {createMirrorSender} from '../src/sequencer-mirror.js';

// Step G3: the worklet's Game Arp (+ silent Root Arp) must ask the note
// controller for exactly what the page asks today: the page's performance-play.js
// clocks, through sid-studio.js play()/stop() (routing, layers, owners,
// voice-enabled gate), on a fake clock, against createWorkletGenerators on
// 128-frame blocks. Worklet calls land at their block's start: up to 2.7 ms early.

const RATE=48000,BLOCK=128;
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const notesSource=studio.slice(studio.indexOf('const activeOwners=new Map();'),studio.indexOf('function updateUnison(){'));

/** Records controller calls as [kind, note, chipMask, layerChip, ms]; offs name the on they release. */
function recorder(now){
 const calls=[],byToken=new Map();
 return {calls,
  on(note,{chipMask,layerChip},token){byToken.set(token,calls.length);calls.push(['on',note,JSON.stringify(chipMask),layerChip??null,now()])},
  off(note,token){calls.push(['off',note,byToken.get(token)??null,null,now()])}};
}

function runPage({transport,sequence,route,enabled=[true,true,true],root=false,preview=false,octave=3,ms,changes=[],arp={step:0,root:null,timer:null,last:null}}){
 const restoreDocument=installFakeDocument();
 const clock=fakeClock();
 const saved={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 globalThis.setTimeout=(fn,delay)=>clock.setTimer(fn,delay);
 globalThis.clearTimeout=id=>clock.clearTimer(id);
 const rec=recorder(clock.now);
 let tokens=0;
 try{
  const scope=vm.createContext({sidEventLog:{enabled:false},sidInputEvent:null,sidContext:{state:'running'},activeSeqStep:-1,
   sidController:{noteOn:(note,_getter,options)=>{const token=++tokens;rec.on(note,options,token);return token},noteOff:(note,token)=>rec.off(note,token)},
   sidAudio:null,canDispatchNote,shouldBlockMusicalInput,needsAudioResume,restoreSidOutput(){},
   pendingSidStartup:null,pendingSidClose:null,presetLoading:false,sidCleanupBlocked:false,sidStarting:false,
   engines:enabled.map(on=>({voice:{enabled:on}})),currentSidSettings:{},
   routingKeyForSource,routeMask,dispatchUsesLayer,DEFAULT_ROUTING,
   performanceRouting:{getState:()=>({keyboard:'all',arp:'all',game:route})},
   sidMusicalInputBlocked:()=>false,transport,traceStudio(){},diagnosticsUi:{afterNoteEvent(){}}});
  vm.runInContext(notesSource,scope);
  const {$}=fakeDom({gameArpStyle:{value:'custom',selectedOptions:[{text:'Custom'}]}});
  let activeSeqStep=-1;
  const api=mountPerformance({
   $,names:NAMES,keyboardState:{octave},
   arp,game:{step:0,timer:null,last:null,gateTimer:null},
   directOwned:new Set(),performanceNote:note=>transport.resolveNote(note),
   play:(note,source)=>scope.play(note,source),stop:(note,source)=>scope.stop(note,source),
   silenceSidOutput:()=>{},refreshPresetDirty:()=>{},
   getArpKeyVisual:()=>({show:()=>{},clear:()=>{}}),
   gameEnabled:()=>true,arpEnabled:()=>root,
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
 return rec.calls;
}

function runWorklet({transport,sequence,route,enabled=[true,true,true],root=false,preview=false,octave=3,ms,changes=[]}){
 transport.setSequence(sequence);
 let frame=0,tokens=0;
 const rec=recorder(()=>frame*1000/RATE);
 const notes={ready:true,
  play:(note,options)=>{const token=++tokens;rec.on(note,options,token);return {token,writes:0}},
  release:(note,token)=>{rec.off(note,token);return 0}};
 const generators=createWorkletGenerators({sampleRate:RATE,notes});
 generators.control({type:GENERATORS_MESSAGE,action:'run',run:1,firstAt:0,rootOn:root,gameOn:true,seqPreview:preview,
  previewRootMidi:(octave+1)*12,route,voiceEnabled:enabled},transport.getState(),0);
 const pending=[...changes];
 const end=Math.round(ms*RATE/1000);
 for(;frame<end;frame+=BLOCK){
  generators.block(frame+BLOCK,transport.getState());
  // A change lands after the steps of the block it falls in.
  while(pending.length&&Math.round(pending[0][0]*RATE/1000)<frame+BLOCK)pending.shift()[1](generators,frame+BLOCK);
 }
 return {calls:rec.calls,report:generators.takeReport(),generators};
}

function assertParity(options){
 const page=runPage({...options,transport:options.transport()});
 const {calls:worklet,report}=runWorklet({...options,transport:options.transport()});
 assert.ok(page.length>=4,'the page played something: '+page.length);
 assert.deepEqual(worklet.map(call=>call.slice(0,4)),page.map(call=>call.slice(0,4)));
 page.forEach((call,i)=>{
  const early=call[4]-worklet[i][4];
  assert.ok(early>=-0.03&&early<=BLOCK*1000/RATE+0.03,'call '+i+': page '+call[4]+' ms, worklet '+worklet[i][4]+' ms');
 });
 return {page,report};
}

const transportWith=(patch,held=[60])=>()=>{
 const transport=createTransportState();
 transport.set({...patch,notes:{held}});
 return transport;
};

test('Action phrase routed to SID 2: same notes, chips and releases as the page',()=>{
 assertParity({transport:transportWith({masterBpm:120,game:{rate:4}}),sequence:sequenceForStyle('action'),route:'sid2',ms:2990});
});

test('route all plays one layer per chip, each with its own owner; a disabled chip is skipped',()=>{
 const {page,report}=assertParity({transport:transportWith({masterBpm:132,game:{rate:4}},[57]),sequence:sequenceForStyle('action'),
  route:'all',enabled:[true,false,true],ms:2490});
 assert.ok(page.some(call=>call[2]==='[2]'&&call[3]===2),'a layer on SID 3');
 assert.ok(!page.some(call=>call[2]==='[1]'),'SID 2 is off');
 assert.ok(report.counts.skipped['voice-disabled']>0);
});

test('Root Arp on: silent root picking transposes the phrase on its boundary, scale lock on',()=>{
 const sequence=defaultSequence();
 sequence.length=8;
 sequence.steps=sequence.steps.map((step,index)=>({...step,offset:[0,7,12,3,-5,0,2,10][index%8]??0,
  gate:index%5!==3,duration:[25,50,75,100][index%4]}));
 assertParity({transport:transportWith({masterBpm:117,arp:{rate:1,pattern:'up',gameTrigger:'phrase-start'},game:{rate:4},
  scale:{tonic:2,id:'dorian',lock:true}},[60,64,67]),sequence,route:'layer',root:true,ms:4990});
});

test('held notes change mid-run and the last key is released: the Game Arp stops as the page does',()=>{
 const make=transportWith({masterBpm:120,game:{rate:4}},[60]);
 const changes=t=>[[1031,()=>t.set({notes:{held:[60,65]}})],[2063,()=>t.set({notes:{held:[65]}})],[3094,()=>t.set({notes:{held:[]}})]];
 let pageTransport,workletTransport;
 const page=runPage({transport:pageTransport=make(),sequence:sequenceForStyle('action'),route:'sid1',ms:4000,
  changes:changes(pageTransport)});
 const {calls:worklet,report,generators}=runWorklet({transport:workletTransport=make(),sequence:sequenceForStyle('action'),route:'sid1',ms:4000,
  changes:changes(workletTransport)});
 assert.deepEqual(worklet.map(call=>call.slice(0,4)),page.map(call=>call.slice(0,4)));
 assert.ok(page.some(call=>call[1]===65),'the new root played');
 assert.ok(report.steps.some(step=>step.stop),'the worklet reported the stop');
 assert.equal(generators.owners.size,0,'nothing left sounding');
});

test('preview with no held key plays from the keyboard octave',()=>{
 assertParity({transport:transportWith({masterBpm:126,game:{rate:2}},[]),sequence:sequenceForStyle('action'),route:'sid1',preview:true,octave:4,ms:2990});
});

test('stop, page-clock sync and reports',()=>{
 const transport=transportWith({masterBpm:120,game:{rate:4}})();
 let tokens=0;const released=[];
 const notes={ready:true,play:()=>({token:++tokens}),release:(note,token)=>released.push([note,token])};
 const generators=createWorkletGenerators({sampleRate:RATE,notes});
 const state=transport.getState();
 generators.control({action:'run',run:7,firstAt:0.05,gameOn:true,route:'sid1'},state,0);
 assert.equal(generators.takeReport().lead,2400,'50 ms ahead');
 generators.block(2400,state);
 assert.equal(generators.takeReport().events.length,0,'nothing before firstAt');
 generators.block(2528,state);
 const first=generators.takeReport();
 assert.deepEqual(first.steps.map(step=>[step.run,step.clock,step.n,step.frame,step.stepIndex]),[[7,'game',0,2400,0]]);
 assert.deepEqual(first.events,[['on',60,'game',2400]]);
 // The page clock says step 1 is 10 ms later than the worklet thinks, four times in a row.
 for(let i=0;i<4;i++)generators.control({action:'sync',run:7,clock:'game',n:1,at:0.05+0.125+0.01},state,2600);
 generators.block(2400+6000+128,state);
 assert.equal(generators.takeReport().steps.filter(step=>step.clock==='game').length,0,'step 1 moved 10 ms later');
 generators.block(2400+6000+480+128,state);
 assert.equal(generators.takeReport().sync.game.syncs,0,'sync stats were taken with the earlier report');
 // Another run's syncs and bad clocks are ignored.
 generators.control({action:'sync',run:6,clock:'game',n:1,at:9},state,9000);
 generators.control({action:'sync',run:7,clock:'drum',n:1,at:9},state,9000);
 generators.control({action:'stop'},state,9000);
 assert.equal(generators.running,false);
 assert.deepEqual(released.at(-1)[0],60,'stop releases the sounding note');
 assert.equal(generators.owners.size,0);
 assert.throws(()=>generators.control({action:'bogus'},state,0),/generators action/);
 const noNotes=createWorkletGenerators({sampleRate:RATE,notes:{ready:false}});
 noNotes.control({action:'run',run:1,firstAt:0,gameOn:true},state,0);
 assert.equal(noNotes.running,false);assert.equal(noNotes.takeReport().error,'note controller not ready');
});

test('releasing the Root Arp root key re-picks the root as keyboard-input keyUp() does',()=>{
 const make=transportWith({masterBpm:120,arp:{rate:1,pattern:'down'},game:{rate:4}},[60,64,67]);
 const sequence=sequenceForStyle('action');
 const pageArp={step:0,root:null,timer:null,last:null};
 const pageT=make(),workletT=make();
 // At 1,060 ms the player lets go of whichever key is the root (the page's keyUp branch).
 const release=(t,root)=>{t.set({notes:{held:t.getState().notes.held.filter(note=>note!==root)}});return root};
 let released=null;
 const page=runPage({transport:pageT,sequence,route:'sid1',root:true,ms:2990,arp:pageArp,changes:[[1060,()=>{
  released=release(pageT,pageArp.root);
  const notes=pageT.arpNotes();
  pageArp.root=notes.length?selectRoot(notes,pageT.arp.pattern,pageArp.step):null;
 }]]});
 const {calls:worklet}=runWorklet({transport:workletT,sequence,route:'sid1',root:true,ms:2990,changes:[[1060,(generators,frame)=>{
  release(workletT,released);
  generators.control({action:'release-root',note:released},workletT.getState(),frame);
 }]]});
 assert.ok(released!==null);
 assert.deepEqual(worklet.map(call=>call.slice(0,4)),page.map(call=>call.slice(0,4)));
});

// ---- Page side: performance-play.js in worklet mode, Prefs, panel line, key release ----

function mountWorkletMode({root=false,active=true}={}){
 const restoreDocument=installFakeDocument();
 const clock=fakeClock();
 const transport=createTransportState();
 transport.set({masterBpm:120,game:{rate:4},arp:{rate:1},notes:{held:[60]}});
 const posted=[],played=[],keys=[];
 const {$}=fakeDom({gameArpStyle:{value:'action',selectedOptions:[{text:'Action'}]}});
 let activeSeqStep=-1,run=0;
 const game={step:0,timer:null,last:null,gateTimer:null};
 const workletGenerators={leadMs:50,active:()=>active,
  run:options=>{posted.push({action:'run',...options,at:clock.now()});return ++run},
  sync:message=>posted.push({action:'sync',...message,at:clock.now()}),
  stop:()=>posted.push({action:'stop',at:clock.now()})};
 const api=mountPerformance({
  $,names:NAMES,keyboardState:{octave:3},
  arp:{step:0,root:null,timer:null,last:null},game,directOwned:new Set(),performanceNote:note=>note,
  play:(note,source)=>played.push(['on',note,source]),stop:(note,source)=>played.push(['off',note,source]),
  silenceSidOutput:()=>{},refreshPresetDirty:()=>{},
  getArpKeyVisual:()=>({show:(note,kind)=>keys.push(['show',note,kind]),clear:kind=>keys.push(['clear',kind])}),
  gameEnabled:()=>true,arpEnabled:()=>root,
  activeNotes:()=>transport.activeNotes(),arpNotes:()=>transport.arpNotes(),
  latchOn:()=>false,isSeqPreview:()=>false,setSeqPreview:()=>{},
  getActiveSeqStep:()=>activeSeqStep,setActiveSeqStep:value=>{activeSeqStep=value},
  performanceArp:{set:()=>{}},transport,workletGenerators,...clock
 });
 return {api,$,clock,posted,played,keys,game,restoreDocument,getStep:()=>activeSeqStep};
}

test('worklet mode: the page sends one run 50 ms ahead, then only page-clock syncs; it plays nothing itself',()=>{
 const page=mountWorkletMode({root:true});
 try{
  page.api.restartGenerators();
  assert.deepEqual(page.posted.at(-1),{action:'run',rootOn:true,seqPreview:false,delayMs:50,at:0});
  assert.equal(page.game.worklet,true);assert.ok(page.game.timer,'a key press does not restart a running worklet arp');
  page.clock.advance(50+125*3+1);
  const syncs=page.posted.filter(message=>message.action==='sync');
  const game=syncs.filter(message=>message.clock==='game');
  assert.deepEqual(game.map(message=>[message.n,message.at,message.delayMs]),[[1,50,125],[2,175,125],[3,300,125],[4,425,125]]);
  assert.deepEqual(syncs.filter(message=>message.clock==='root').map(message=>[message.n,message.at]),[[1,50]]);
  assert.deepEqual(page.played,[],'no play()/stop() from the page');
  page.api.gameStop();
  assert.equal(page.posted.at(-1).action,'stop');assert.equal(page.game.worklet,false);
  const count=page.posted.length;
  page.clock.advance(1000);
  assert.equal(page.posted.length,count,'no syncs after stop');
 }finally{page.restoreDocument()}
});

test('worklet reports drive the step highlight, key highlight and status; stale runs are ignored',()=>{
 const page=mountWorkletMode({root:true});
 try{
  page.api.restartGenerators();
  page.api.applyWorkletReport({steps:[
   {run:1,clock:'root',highlight:{root:64},status:{type:'root',note:64,count:3}},
   {run:1,clock:'game',stepIndex:2,highlight:{game:67},status:{index:2,type:'note',root:64}}]});
  assert.equal(page.getStep(),2);
  assert.deepEqual(page.keys.slice(-2),[['show',64,'root'],['show',67,'game']]);
  assert.match(page.$('arpStatus').textContent,/step 3 · E4/);
  page.api.applyWorkletReport({steps:[{run:1,clock:'gate'}]});
  assert.deepEqual(page.keys.at(-1),['clear','game']);
  page.api.applyWorkletReport({steps:[{run:99,clock:'game',stepIndex:5,highlight:{},status:{index:5,type:'rest'}}]});
  assert.equal(page.getStep(),2,'another run');
  page.api.applyWorkletReport({steps:[{run:1,clock:'game',stop:true}]});
  assert.equal(page.getStep(),-1);assert.equal(page.$('arpStatus').textContent,'No notes held');
  assert.equal(page.game.timer,null,'the next key press restarts the generators');
 }finally{page.restoreDocument()}
});

test('setting off or unavailable: the page timer plays the Game Arp as before',()=>{
 const page=mountWorkletMode({active:false});
 try{
  page.api.restartGenerators();
  assert.equal(page.posted.length,0);
  assert.deepEqual(page.played[0],['on',60,'game']);
 }finally{page.restoreDocument()}
});

test('releasing the root key in worklet mode asks the worklet to re-pick the root',()=>{
 const released=[];
 const transport=createTransportState();
 transport.set({notes:{held:[60,64]}});
 const arp={root:60,step:1};
 const gesture=createKeyGesture({audioTiming:{},sidEventLog:{enabled:false,add(){}},getSidContext:()=>({state:'running'}),
  sidMusicalInputBlocked:()=>false,armSidResume(){},hasController:()=>true,countKeyPress(){},
  activeNotes:()=>transport.activeNotes(),arp,game:{timer:1,worklet:true},gameEnabled:()=>true,arpEnabled:()=>true,
  latchOn:()=>false,directOwned:new Set(),play(){},stop(){},restartGenerators(){},stopGenerators(){},
  gameRestart(){},arpStopVoice(){},arpNotes:()=>transport.arpNotes(),isSeqPreview:()=>false,performanceNote:note=>note,
  $:()=>({textContent:''}),transport,releaseWorkletRoot:note=>released.push(note)});
 gesture.keyUp(64);
 assert.deepEqual(released,[64]);
 assert.equal(arp.root,60,'the page root is not touched');
});

test('Prefs: off by default, remembered, and the status says who plays the Game Arp',()=>{
 const store=new Map();
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const elements={workletGameArpTiming:{checked:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn}},workletGameArpTimingStatus:{textContent:''}};
 const ok={available:true,version:9,selfTest:{ok:true}};
 let support=null;const changes=[];
 const pref=mountWorkletGameArpTimingPref(id=>elements[id],{storage,getSupport:()=>support,onChange:on=>changes.push(on)});
 assert.equal(pref.enabled,false);assert.equal(elements.workletGameArpTiming.checked,false);
 assert.match(elements.workletGameArpTimingStatus.textContent,/^Off/);
 elements.workletGameArpTiming.checked=true;elements.workletGameArpTiming.listeners.change();
 assert.deepEqual(changes,[true]);assert.equal(store.get(WORKLET_GAME_ARP_TIMING_KEY),'on');
 assert.match(elements.workletGameArpTimingStatus.textContent,/waiting for the audio engine/);
 assert.equal(pref.supported(),false);
 support=ok;pref.refresh();
 assert.equal(pref.supported(),true);
 assert.match(elements.workletGameArpTimingStatus.textContent,/audio engine plays the Game Arp/);
 assert.equal(workletGeneratorsSupported({...ok,version:8}),false);
 assert.match(workletGameArpTimingStatus(true,{...ok,version:8}),/modules too old \(v8\)/);
 const again=mountWorkletGameArpTimingPref(id=>({...elements[id]}),{storage});
 assert.equal(again.enabled,true,'remembered');
});

test('Audio timing line for the worklet Game Arp',()=>{
 assert.equal(formatWorkletGameArp(null),'Game Arp timing: page timer');
 assert.match(formatWorkletGameArp({enabled:true,active:false}),/on but unavailable/);
 assert.equal(formatWorkletGameArp({enabled:true,active:true,playing:true,steps:12,notes:9,leadMs:44.5,skipped:{'voice-disabled':2},
  syncs:3,shiftMaxMs:12.25,syncSkipped:1,error:null}),
  'Game Arp timing: worklet (playing) · 12 steps, 9 notes · start lead +44.5 ms · skipped voice-disabled 2 · re-synced to the page clock 3× (largest 12.3 ms, 1 steps skipped)');
});

test('the worklet processor plays the Game Arp from a queued run, in order with note ops, and reports steps',async()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const {default:sequencer}=await import('../src/sequencer-worklet-modules.js');
 assert.equal(sequencer.version,9);
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:RATE,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 scope.project6581Sequencer=sequencer;
 vm.runInContext(source,scope);
 const processor=new Processor();
 const writes=[];
 processor.exports={memory:new WebAssembly.Memory({initial:1}),sid_write:(register,value)=>writes.push([register,value]),sid_render:frames=>frames,sid_pcm_ptr:()=>0};
 const deliver=message=>processor.port.onmessage({data:structuredClone(message)});
 // Mirror: transport with a held note.
 const transport=createTransportState();transport.set({masterBpm:120,game:{rate:4},notes:{held:[60]}});
 const mirror=createMirrorSender(deliver);mirror.reset();mirror.syncTransport(transport.getState());
 // Page: G2 proxy (init + live settings) through a batcher, then the run (flushes the batcher first).
 const batcher=createSidWriteBatcher(deliver,()=>{});
 const voices=[0,1,2].map(()=>({wave:'square',attack:0,decay:0.1,sustain:0.6,release:0.1,pulse:50,enabled:true}));
 const live=slot=>voices[Math.floor(slot/3)];
 const proxy=createNoteControllerProxy(op=>batcher.op(op),{liveGetter:live});
 proxy.syncLive();batcher.flush();
 deliver({type:GENERATORS_MESSAGE,action:'run',run:1,firstAt:0.01,gameOn:true,route:'sid1',voiceEnabled:[true,true,true]});
 const block=[new Float32Array(BLOCK)];
 let frame=0;
 const runBlocks=count=>{for(let i=0;i<count;i++){scope.currentFrame=frame;processor.process([],[block]);frame+=BLOCK}};
 runBlocks(3);
 assert.equal(writes.some(([register])=>register===4),false,'nothing before firstAt (480 frames)');
 runBlocks(1);
 assert.ok(writes.some(([register,value])=>register===4&&value===0x41),'SID 1 voice 1 gated on');
 const status=messages.filter(m=>m.type==='sequencer-generators-status');
 assert.deepEqual(status.flatMap(m=>m.steps).map(step=>[step.clock,step.stepIndex,step.frame]),[['game',0,480]]);
 assert.deepEqual(status.flatMap(m=>m.events),[['on',60,'game',480]]);
 // Stop (after a queued page op): the note is released.
 proxy.setLiveDetune(10);
 batcher.flush();deliver({type:GENERATORS_MESSAGE,action:'stop'});
 writes.length=0;runBlocks(1);
 assert.ok(writes.some(([register,value])=>register===4&&value===0x40),'gate off');
});

test('fast steps with long gates: a gate-off due just before the next step in the same block goes first',()=>{
 const sequence=defaultSequence();
 sequence.length=4;
 sequence.steps=sequence.steps.map((step,index)=>({...step,offset:[0,5,7,12][index%4],duration:[95,90,95,100][index%4]}));
 assertParity({transport:transportWith({masterBpm:240,game:{rate:16}},[60]),sequence,route:'sid1',ms:1004});
});

test('a sync that finds the worklet behind skips steps and moves the phrase on, like the page',()=>{
 const transport=transportWith({masterBpm:120,game:{rate:4}})();
 const state=transport.getState();
 let tokens=0;
 const generators=createWorkletGenerators({sampleRate:RATE,notes:{ready:true,play:()=>({token:++tokens}),release:()=>{}}});
 generators.control({action:'run',run:1,firstAt:0,gameOn:true,route:'sid1'},state,0);
 generators.block(128,state);generators.takeReport();
 // The page says step 1 is due 0.5 s earlier than the worklet's grid: four steps behind.
 for(let i=0;i<4;i++)generators.control({action:'sync',run:1,clock:'game',n:9,at:1.125-0.5},state,48000);
 generators.block(48000+128,state);
 const report=generators.takeReport();
 assert.equal(report.sync.game.syncs,1);
 assert.ok(report.sync.game.skipped>=3);
 const step=report.steps.find(entry=>entry.clock==='game');
 assert.equal(step.stepIndex,(1+report.sync.game.skipped)%16,'the phrase moved past the skipped steps');
});

// G4: Root→Game trigger modes. Owner's example: Root 1/2, Game 1/16 → 8 Game steps per Root step.
const G4_OFFSETS=[0,7,12,3,-5,2,10,5,0,12,7,19,3,-2,14,9];
function g4Sequence(){
 const sequence=defaultSequence();
 sequence.length=16;
 sequence.steps=sequence.steps.map((step,index)=>({...step,offset:G4_OFFSETS[index],gate:true,duration:100}));
 return sequence;
}
const ons=calls=>calls.filter(call=>call[0]==='on').map(call=>call[1]);

test('G4 Every root step: each Root step restarts the phrase on its root (page = worklet)',()=>{
 const {page}=assertParity({transport:transportWith({masterBpm:120,arp:{rate:0.5,pattern:'up',gameTrigger:'every-step'},game:{rate:4}},[60,64,67]),
  sequence:g4Sequence(),route:'sid1',root:true,ms:3990});
 const first8=G4_OFFSETS.slice(0,8);
 assert.deepEqual(ons(page),[...first8.map(o=>60+o),...first8.map(o=>64+o),...first8.map(o=>67+o),...first8.map(o=>60+o)]);
});

test('G4 New root only: the phrase restarts when the root changes, runs on when it repeats',()=>{
 // One held note: the root never changes, so the 16-step phrase runs through.
 const {page:same}=assertParity({transport:transportWith({masterBpm:120,arp:{rate:0.5,gameTrigger:'new-root'},game:{rate:4}},[60]),
  sequence:g4Sequence(),route:'sid1',root:true,ms:3990});
 assert.deepEqual(ons(same),[...G4_OFFSETS,...G4_OFFSETS].map(o=>60+o));
 const {page:moving}=assertParity({transport:transportWith({masterBpm:120,arp:{rate:0.5,pattern:'up',gameTrigger:'new-root'},game:{rate:4}},[60,64]),
  sequence:g4Sequence(),route:'sid1',root:true,ms:1990});
 const first8=G4_OFFSETS.slice(0,8);
 assert.deepEqual(ons(moving),[...first8.map(o=>60+o),...first8.map(o=>64+o)]);
});

test('G4 Phrase start: no restart; the new root is taken when the phrase comes round',()=>{
 const {page}=assertParity({transport:transportWith({masterBpm:120,arp:{rate:0.5,pattern:'up',gameTrigger:'phrase-start'},game:{rate:4}},[60,64]),
  sequence:g4Sequence(),route:'sid1',root:true,ms:3990});
 // Root steps at 0, 1, 2, 3 s pick 60, 64, 60, 64; the phrase boundaries (0 s, 2 s) take 60 both times.
 assert.deepEqual(ons(page),[...G4_OFFSETS,...G4_OFFSETS].map(o=>60+o));
});

test('G4 page timers: a Game step that fires before the Root step of the same instant still restarts the phrase',()=>{
 const restoreDocument=installFakeDocument();
 const clock=fakeClock();
 const saved={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 globalThis.setTimeout=(fn,delay)=>clock.setTimer(fn,delay);
 globalThis.clearTimeout=id=>clock.clearTimer(id);
 const played=[];
 try{
  const transport=transportWith({masterBpm:120,arp:{rate:0.5,pattern:'up',gameTrigger:'every-step'},game:{rate:4}},[60,64])();
  const {$}=fakeDom({gameArpStyle:{value:'custom',selectedOptions:[{text:'Custom'}]}});
  let activeSeqStep=-1;
  const api=mountPerformance({
   $,names:NAMES,keyboardState:{octave:3},
   arp:{step:0,root:null,timer:null,last:null},game:{step:0,timer:null,last:null,gateTimer:null},
   directOwned:new Set(),performanceNote:note=>note,
   play:note=>played.push(note),stop:()=>{},silenceSidOutput(){},refreshPresetDirty(){},
   getArpKeyVisual:()=>({show(){},clear(){}}),
   gameEnabled:()=>true,arpEnabled:()=>true,
   activeNotes:()=>transport.activeNotes(),arpNotes:()=>transport.arpNotes(),
   latchOn:()=>false,isSeqPreview:()=>false,setSeqPreview(){},
   getActiveSeqStep:()=>activeSeqStep,setActiveSeqStep:value=>{activeSeqStep=value},
   performanceArp:{set(){}},transport,...clock
  });
  transport.setSequence(g4Sequence());api.renderSequenceSteps();
  api.restartGenerators();
  clock.advance(999);
  // Both clocks are due at 1000 ms; the browser runs the Game timer's callback first.
  clock.stall(1);
  const [rootFn,gameFn]=clock.timerFns();
  assert.notEqual(rootFn,gameFn);
  clock.run(gameFn);
  assert.equal(played.at(-1),64+G4_OFFSETS[0],'the Root step ran first: phrase step 1 on the new root');
  assert.equal(clock.timerFns().length,2,'both clocks are rescheduled once');
  clock.advance(125);
  assert.equal(played.at(-1),64+G4_OFFSETS[1]);
 }finally{
  Object.assign(globalThis,saved);restoreDocument();
 }
});
