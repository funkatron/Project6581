import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDrumShadow,createShadowComparator,drumStepSeconds,formatDrumShadow} from '../src/sequencer-shadow.js';
import {mountDrumPerformance,drumStepIntervalMs} from '../src/drum-performance.js';
import {createTransportState,drumSequence} from '../src/transport-state.js';
import {drumStep} from '../src/sequencer-steps.js';
import {createMirrorSender} from '../src/sequencer-mirror.js';
import {fakeDom,recordTimers} from './fixtures/fake-dom.mjs';

const RATE=48000;

test('worklet step length equals the page drum timer interval',()=>{
 const transport=createTransportState();
 for(const patch of [{},{masterBpm:128},{drum:{rate:2}},{drum:{sync:false,localBpm:93,rate:8}},{masterBpm:40,drum:{rate:0.25}}]){
  transport.set(patch);
  const state=transport.getState();
  assert.equal(drumStepSeconds(state)*1000,drumStepIntervalMs(drumSequence(state),state.masterBpm),JSON.stringify(patch));
 }
});

test('the shadow counts steps on frames from its anchor and reports the lanes it would hit',()=>{
 const state=createTransportState().getState();
 const shadow=createDrumShadow(RATE);
 shadow.control({action:'run',run:3,step:14,firstAt:1},state,RATE-480);
 shadow.advance(RATE,state);
 assert.equal(shadow.hasReport(),true,'the start lead is reported even before a step');
 shadow.advance(RATE+3*6000,state);
 const report=shadow.takeReport();
 assert.equal(report.lead,480);
 const lanes=index=>drumStep({step:index},{sequence:drumSequence(state)}).hits.map(hit=>hit.lane).join(',');
 assert.deepEqual(report.steps,[[3,0,RATE,14,lanes(14)],[3,1,RATE+6000,15,lanes(15)],[3,2,RATE+12000,0,lanes(0)]]);
 shadow.control({action:'stop'},state,RATE*2);
 shadow.advance(RATE*10,state);
 assert.equal(shadow.hasReport(),false);
});

test('the shadow reports a run that arrives before any transport',()=>{
 const shadow=createDrumShadow(RATE);
 shadow.control({action:'run',run:1,step:0,firstAt:0},null,0);
 assert.equal(shadow.running,false);
 assert.equal(shadow.takeReport().error,'no transport mirrored');
});

test('one block never emits more than eight steps',()=>{
 const state=createTransportState().getState();
 const shadow=createDrumShadow(RATE);
 shadow.control({action:'run',run:1,step:0,firstAt:0},state,RATE*100);
 shadow.advance(RATE*100,state);
 assert.equal(shadow.takeReport().steps.length,8);
});

// Drives the real drum performance with fake timers and a fake audio clock.
function harness({lateMs=4}={}){
 const {$}=fakeDom({drumRate:{value:'4'},drumSync:{checked:true},drumBpm:{value:'120'}});
 const transport=createTransportState();
 let time=0;
 const worklet=createDrumShadow(RATE);
 const comparator=createShadowComparator({now:()=>time,post:message=>worklet.control(message,transport.getState(),Math.round(time*RATE))});
 const drum={step:0,timer:null,running:false};
 const timers=recordTimers();
 let api;
 try{api=mountDrumPerformance({$,drum,transport,triggerDrumStep:()=>{},stopDrumVoices:()=>{},shadow:comparator})}
 finally{timers.restore()}
 const deliver=()=>{
  worklet.advance(Math.round(time*RATE)+128,transport.getState());
  if(worklet.hasReport())comparator.receive(worklet.takeReport());
 };
 // Fires the latest interval n times, each lateMs after its ideal time.
 const fire=(n,start,stepMs)=>{
  for(let k=1;k<=n;k++){time=start+(k*stepMs+lateMs)/1000;deliver();timers.intervals.at(-1).fn()}
 };
 return {$,api,comparator,timers,transport,drum,deliver,fire,setTime:t=>{time=t},get time(){return time},
  start:()=>{const saved=recordTimers();try{api.drumStart()}finally{saved.restore()};timers.intervals.push(...saved.intervals)},
  restart:()=>{const saved=recordTimers();try{$('drumRate').dispatch('change')}finally{saved.restore()};timers.intervals.push(...saved.intervals)}};
}

test('page ticks and worklet steps match through a tempo restart; lateness is measured',()=>{
 const h=harness({lateMs:4});
 h.start();
 h.fire(15,0,125);
 let summary=h.comparator.summary();
 assert.equal(summary.compared,16);
 assert.equal(summary.hitsMatch,summary.compared);
 assert.ok(Math.abs(summary.lateMax-4)<0.05,'late '+summary.lateMax);
 assert.ok(Math.abs(summary.lateMin)<0.05);
 // Restart at 1/8 halfway between steps; the next tick comes one new interval later.
 const restartAt=h.time+0.03;
 h.setTime(restartAt);
 h.transport.set({drum:{rate:2}});
 h.restart();
 assert.equal(h.timers.intervals.at(-1).ms,250);
 h.fire(8,restartAt,250);
 h.setTime(h.time+1);h.deliver();
 summary=h.comparator.summary();
 assert.equal(summary.compared,16+8);
 assert.equal(summary.hitsMatch,summary.compared);
 assert.ok(Math.abs(summary.lateAvg-4*23/24)<0.05,'avg '+summary.lateAvg);
 assert.ok(summary.lastLeadMs>249&&summary.lastLeadMs<=250,'lead '+summary.lastLeadMs);
 h.api.drumStop();
 assert.equal(h.comparator.running,false);
 assert.match(formatDrumShadow(h.comparator.summary()),
  /^Drum shadow clock: 24 steps · hits match 24\/24 · page timer vs audio clock avg \+3\.8 ms, range \+0\.0 ms to \+4\.0 ms · start message lead \+250\.0 ms$/);
});

test('a step whose lanes differ (for example a grid edit in flight) counts as a mismatch',()=>{
 const page=createShadowComparator({now:()=>0,post:()=>{}});
 page.run({step:0});
 page.tick({index:0,hits:[{lane:'kick'}]});
 page.tick({index:1,hits:[]});
 page.receive({sampleRate:RATE,steps:[[1,0,0,0,'kick'],[1,1,6000,1,'sn']],dropped:0,lead:null,error:null});
 assert.deepEqual([page.summary().compared,page.summary().hitsMatch],[2,1]);
});

test('reports may arrive before or after the page tick',()=>{
 const sent=[];let time=0;
 const page=createShadowComparator({now:()=>time,post:m=>sent.push(m)});
 const state=createTransportState().getState();
 page.run({step:0});
 const worklet=createDrumShadow(RATE);
 worklet.control(sent[0],state,0);
 worklet.advance(RATE,state);
 page.receive(worklet.takeReport());
 for(let k=0;k<8;k++){time=k*0.125+0.002;page.tick(drumStep({step:k},{sequence:drumSequence(state)}))}
 const summary=page.summary();
 assert.equal(summary.compared,8);
 assert.equal(summary.hitsMatch,8);
 assert.ok(Math.abs(summary.lateAvg-2)<0.01);
});

test('idle, waiting and error lines',()=>{
 assert.equal(formatDrumShadow(undefined),'Drum shadow clock: idle (start the drum preview to compare)');
 const page=createShadowComparator({now:()=>0,post:()=>{}});
 page.run({step:0});
 assert.equal(formatDrumShadow(page.summary()),'Drum shadow clock: waiting for steps');
 page.receive({sampleRate:RATE,steps:[],dropped:0,lead:null,error:'no transport mirrored'});
 assert.equal(formatDrumShadow(page.summary()),'Drum shadow clock: error (no transport mirrored)');
});

test('the worklet processor runs the shadow from mirrored transport and reports at most 4 times a second',async()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const {default:sequencer}=await import('../src/sequencer-worklet-modules.js');
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:RATE,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 scope.project6581Sequencer=sequencer;
 vm.runInContext(source,scope);
 const processor=new Processor();
 const sent=[];
 const mirror=createMirrorSender(m=>sent.push(m));
 mirror.reset();mirror.syncTransport(createTransportState().getState());
 for(const m of sent)processor.port.onmessage({data:m});
 processor.port.onmessage({data:{type:'sequencer-shadow',source:'drum',action:'run',run:1,step:0,firstAt:0}});
 const block=[new Float32Array(128)];
 for(let frame=0;frame<RATE*1.5;frame+=128){scope.currentFrame=frame;processor.process([],[block])}
 const reports=messages.filter(m=>m.type==='sequencer-shadow-status');
 assert.ok(reports.length>=5&&reports.length<=7,String(reports.length));
 const steps=reports.flatMap(r=>r.steps).filter(s=>s[2]<RATE);
 assert.deepEqual(steps.map(s=>s[2]),Array.from({length:8},(_,n)=>n*6000));
 assert.deepEqual(steps.map(s=>s[3]),[0,1,2,3,4,5,6,7]);
 processor.port.onmessage({data:{type:'sequencer-shadow',source:'drum',action:'stop'}});
 const before=messages.length;
 for(let frame=RATE*1.5;frame<RATE*3;frame+=128){scope.currentFrame=frame;processor.process([],[block])}
 assert.ok(messages.length-before<=1,'at most the last pending report after stop');
});
