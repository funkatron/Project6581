import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createWorkletDrums} from '../src/worklet-drums.js';
import {createTransportState,drumSequence,drumLaneAudible} from '../src/transport-state.js';
import {drumStep} from '../src/sequencer-steps.js';
import {resolveDrumHitsOnStep} from '../src/drum-voice-policy.js';
import {createMirrorSender,emptyMirror,applyMirrorMessage} from '../src/sequencer-mirror.js';
import {createDefaultEngines} from '../src/sid-engines.js';
import {drumLaneTimbre} from '../src/drum-lane-trigger.js';
import {defaultDrumKit,validateDrumKit} from '../src/drum-step-sequencer.js';
import {FACTORY_PRESETS} from '../src/preset-library.js';

const RATE=48000;
/** Grid rows from 16-character strings ('x' = hit), lane order kick, sn, ch, oh. */
const grid=rows=>['kick','sn','ch','oh'].map(lane=>[...(rows[lane]??'................')].map(c=>c==='x'));
const GATE={kick:0x64,sn:0x84,ch:0xa4,oh:0xa4};// SID 4–6 voice 1 control register

/** A mirror built the way the page builds it (syncWorkletMirror), with transport patched. */
function pageMirror(transportPatch={}){
 const transport=createTransportState();
 transport.set(transportPatch);
 const engines=createDefaultEngines(6581);
 const sent=[];
 const sender=createMirrorSender(m=>sent.push(structuredClone(m)));
 sender.reset();
 sender.syncTransport(transport.getState());
 for(const [laneId,lane] of Object.entries(validateDrumKit(defaultDrumKit()).lanes)){
  const factory=FACTORY_PRESETS.find(preset=>preset.id===lane.presetId);
  const {voice,filter}=drumLaneTimbre(factory.settings,lane);
  sender.syncDrumLane(laneId,{note:Math.max(0,Math.min(127,lane.midiNote+(lane.pitchOffsetSemitones??0))),level:lane.level,voice,filter});
 }
 for(let bus=0;bus<3;bus++)sender.syncDrumBus(bus,{filter:{...engines[3+bus].filter},enabled:Boolean(engines[3+bus].voice.enabled)});
 return {sent,mirror:sent.reduce(applyMirrorMessage,emptyMirror()),transport};
}

/** Lanes the page's triggerDrumStep() would play on a step. */
function pageLanes(state,index){
 const hits=drumStep({step:index},{sequence:drumSequence(state)}).hits.filter(hit=>drumLaneAudible(state,hit.lane));
 return resolveDrumHitsOnStep(hits).map(hit=>hit.lane);
}
const gatedLanes=commands=>Object.entries(GATE)
 .filter(([,register])=>commands.some(c=>c.type==='write'&&c.register===register&&(c.value&1)===1))
 .map(([lane])=>lane);

test('each step plays the lanes the page would, with mute, solo and the hat choke', () => {
 const g=grid({kick:'x...x...x...x...',sn:'....x.......x...',ch:'xxxxxxxx........',oh:'..x...x...x...x.'});
 const played=new Set();
 for(const drum of [{grid:g},{grid:g,mute:{ch:true}},{grid:g,solo:{sn:true}},{grid:g,solo:{oh:true,kick:true}},{grid:g,mute:{kick:true,sn:true,ch:true,oh:true}}]){
  const {mirror}=pageMirror({drum});
  const drums=createWorkletDrums({sampleRate:RATE});
  drums.control({action:'run',play:true});
  for(let index=0;index<16;index++){
   const frame=index*6000;
   const commands=drums.block([{frame,index}],mirror,frame+128);
   const expected=pageLanes(mirror.transport,index);
   for(const lane of expected)played.add(lane);
   // CH and OH share the SID 6 gate register.
   const hats=expected.filter(lane=>lane==='ch'||lane==='oh');
   assert.deepEqual(gatedLanes(commands).filter(lane=>lane!=='oh'),
    [...expected.filter(lane=>lane==='kick'||lane==='sn'),...(hats.length?['ch']:[])],JSON.stringify(drum)+' step '+index);
  }
 }
 assert.deepEqual([...played].sort(),['ch','kick','oh','sn'],'every lane was exercised');
});

test('nothing plays until a run asks for it; stop and a non-playing run release held drums', () => {
 const {mirror}=pageMirror();
 const drums=createWorkletDrums({sampleRate:RATE});
 assert.deepEqual(drums.block([{frame:0,index:0}],mirror,128),[],'not playing');
 drums.control({action:'run',play:true});
 assert.ok(drums.block([{frame:128,index:0}],mirror,256).length>0);
 const off=drums.control({action:'stop'});
 assert.ok(off.some(c=>c.register===0x64&&(c.value&1)===0),'kick gate off');
 assert.equal(drums.playing,false);
 drums.control({action:'run',play:true});
 drums.block([{frame:512,index:0}],mirror,640);
 assert.ok(drums.control({action:'run',play:false}).length>0,'switching to page drums releases worklet drums');
 const {events:_events,eventsDropped:_dropped,...counts}=drums.takeStats();
 assert.deepEqual(counts,{hits:4,auditions:0,skipped:{}});
});

test('a re-hit before release gates off first; a release due inside a block is written in that block', () => {
 const {mirror}=pageMirror({drum:{grid:grid({kick:'xx..............'})}});
 const drums=createWorkletDrums({sampleRate:RATE});
 drums.control({action:'run',play:true});
 const first=drums.block([{frame:0,index:0}],mirror,128);
 const releaseFrames=Math.round(121*RATE/1000);// default kick: drumReleaseMilliseconds 121
 assert.ok(first.length);
 // Re-hit at 3,000 frames, before the first kick's release.
 const rehit=drums.block([{frame:3000,index:1}],mirror,3072).filter(c=>c.register===0x64).map(c=>c.value&1);
 assert.deepEqual([rehit[0],rehit.at(-1)],[0,1]);
 // The first kick's release never fires; the second's lands in the block holding 3000 + releaseFrames.
 const offAt=3000+releaseFrames;
 for(let start=3072;start<RATE;start+=128){
  const writes=drums.block([],mirror,start+128).filter(c=>c.type==='write');
  if(start+128<=offAt)assert.deepEqual(writes,[],'nothing before the release, block '+start);
  else if(start<=offAt)assert.deepEqual(writes.map(c=>[c.register,c.value&1]),[[0x64,0]]);
  else assert.deepEqual(writes,[]);
 }
});

test('missing mirror data skips the hit and is counted, not thrown', () => {
 const drums=createWorkletDrums({sampleRate:RATE});
 drums.control({action:'run',play:true});
 assert.deepEqual(drums.block([{frame:0,index:0}],null,128),[]);
 const {mirror}=pageMirror();
 assert.deepEqual(drums.block([{frame:0,index:0}],{...mirror,drumBuses:[null,null,null]},128),[]);
 assert.deepEqual(drums.audition('sn',{...mirror,drumLanes:{...mirror.drumLanes,sn:null}},0),[]);
 const disabled={...mirror,drumBuses:mirror.drumBuses.map(bus=>({...bus,enabled:false}))};
 assert.deepEqual(drums.audition('kick',disabled,0),[]);
 assert.deepEqual(drums.takeStats(),{hits:0,auditions:0,skipped:{'no-transport':1,'no-bus':2,'no-lane':1,'voice-disabled':1},events:[],eventsDropped:0});
 assert.throws(()=>drums.audition('tom',mirror,0),RangeError);
});

/** The real processor in vm, with a fake WASM export table that records writes by frame. */
async function processorHarness(){
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const {default:sequencer}=await import('../src/sequencer-worklet-modules.js');
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:RATE,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 scope.project6581Sequencer=sequencer;
 vm.runInContext(source,scope);
 const processor=new Processor();
 const writes=[];
 const memory={buffer:new ArrayBuffer(4096)};
 processor.exports={memory,sid_write:(register,value)=>writes.push({frame:scope.currentFrame,register,value}),
  sid_render:frames=>frames,sid_pcm_ptr:()=>0,sid_reset(){}};
 const send=data=>processor.port.onmessage({data});
 const block=[new Float32Array(128),new Float32Array(128)];
 const runTo=end=>{for(;scope.currentFrame<end;scope.currentFrame+=128)processor.process([],[block])};
 return {scope,processor,messages,writes,send,runTo};
}

test('the processor plays drum steps in the block where each step falls (within 128 frames)', async () => {
 const h=await processorHarness();
 const {sent,mirror}=pageMirror();
 for(const m of sent)h.send(m);
 // Start message arrives at frame 0; first step 50 ms later (the page's lookahead).
 h.send({type:'sequencer-shadow',source:'drum',action:'run',run:1,step:0,firstAt:0.05,play:true});
 h.runTo(RATE);
 const kickOns=h.writes.filter(w=>w.register===0x64&&(w.value&1)===1).map(w=>w.frame);
 const expected=[];
 for(let n=0;n*6000+2400<RATE;n++)if(pageLanes(mirror.transport,n%16).includes('kick'))expected.push(n*6000+2400);
 assert.ok(expected.length>=2,'the default groove has kicks in the first second');
 assert.equal(kickOns.length,expected.length);
 kickOns.forEach((frame,i)=>{
  assert.ok(frame<=expected[i]&&expected[i]-frame<128,'kick '+i+' at '+frame+', step at '+expected[i]);
 });
 const report=h.messages.filter(m=>m.type==='sequencer-shadow-status').at(-1);
 assert.ok(report.drums.hits>0,'reports carry worklet hit counts');
 // Stop: every drum gate goes off and no later step plays.
 h.send({type:'sequencer-shadow',source:'drum',action:'stop'});
 const stopAt=h.scope.currentFrame;
 h.runTo(RATE*2);
 const after=h.writes.filter(w=>w.frame>=stopAt&&[0x64,0x84,0xa4].includes(w.register));
 assert.ok(after.every(w=>(w.value&1)===0),'only gate-offs after stop');
});

test('without play:true the processor only counts steps, as the 3b shadow did', async () => {
 const h=await processorHarness();
 for(const m of pageMirror().sent)h.send(m);
 h.send({type:'sequencer-shadow',source:'drum',action:'run',run:1,step:0,firstAt:0});
 h.runTo(RATE);
 assert.deepEqual(h.writes.filter(w=>w.register>=0x60),[]);
 assert.ok(h.messages.some(m=>m.type==='sequencer-shadow-status'&&m.steps.length));
});

test('a grid-cell audition plays one lane on the next block and releases it', async () => {
 const h=await processorHarness();
 for(const m of pageMirror().sent)h.send(m);
 h.runTo(1280);
 h.send({type:'sequencer-drums',action:'audition',lane:'sn'});
 h.runTo(RATE);
 const sn=h.writes.filter(w=>w.register===0x84);
 assert.equal(sn[0].frame,1280);
 assert.equal(sn.at(-1).value&1,0,'released');
 assert.ok(h.writes.some(w=>w.register===0x98&&w.frame===1280),'snare bus filter written with the hit');
});

test('note events: each hit an on, each release, re-hit or stop an off, with frames', () => {
 const {mirror}=pageMirror({drum:{grid:grid({kick:'xx..............',ch:'x...............',oh:'.x..............'})}});
 const drums=createWorkletDrums({sampleRate:RATE});
 drums.control({action:'run',play:true});
 drums.block([{frame:0,index:0}],mirror,128);
 drums.block([{frame:3000,index:1}],mirror,3072);// kick re-hit while still sounding; OH plays
 let stats=drums.takeStats();
 assert.deepEqual(stats.events.map(e=>e.slice(0,2).concat(e[3],e[4])),[
  ['on','kick',0,0],['on','ch',0,0],
  ['off','ch',2544,-1],// CH's own release (53 ms) falls before the step
  ['off','kick',3000,-1],['on','kick',3000,1],['on','oh',3000,1]
 ]);
 assert.equal(drums.hasEvents,false);
 // Run to the kick's release, then stop with the open hat still sounding.
 for(let start=3072;start<3000+Math.round(121*RATE/1000)+128;start+=128)drums.block([],mirror,start+128);
 drums.control({action:'stop'},9000);
 stats=drums.takeStats();
 assert.deepEqual(stats.events.map(e=>[e[0],e[1],e[3]]),[['off','kick',3000+Math.round(121*RATE/1000)],['off','oh',9000]]);
 assert.equal(stats.eventsDropped,0);
});

test('worklet note events become drum:* trace lines on the page clock', async () => {
 const {workletDrumTraceEntries}=await import('../src/sequencer-shadow.js');
 const lines=workletDrumTraceEntries([['on','kick',36,48000,0],['off','kick',36,53808,-1],['on','sn',38,60000,-1]],
  {sampleRate:RATE,audioNowSec:1.5,pageNowMs:10000});
 assert.deepEqual(lines,[
  {type:'note-on',details:{atMs:9500,note:36,source:'drum:kick',player:'worklet',frame:48000,step:0}},
  {type:'note-off',details:{atMs:9621,note:36,source:'drum:kick',player:'worklet',frame:53808}},
  {type:'note-on',details:{atMs:9750,note:38,source:'drum:sn',player:'worklet',frame:60000}}
 ]);
 assert.deepEqual(workletDrumTraceEntries(null,{sampleRate:RATE,audioNowSec:0,pageNowMs:0}),[]);
});

test('the processor reports tap note events even when the drum preview is stopped', async () => {
 const h=await processorHarness();
 for(const m of pageMirror().sent)h.send(m);
 h.runTo(1280);
 h.send({type:'sequencer-drums',action:'audition',lane:'kick'});
 h.runTo(RATE);
 const events=h.messages.filter(m=>m.type==='sequencer-shadow-status').flatMap(m=>m.drums?.events??[]);
 assert.deepEqual(events.map(e=>[e[0],e[1],e[3]]),[['on','kick',1280],['off','kick',1280+Math.round(121*RATE/1000)]]);
});
