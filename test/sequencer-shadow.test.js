import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDrumShadow,createShadowComparator,drumStepSeconds,formatDrumShadow} from '../src/sequencer-shadow.js';
import {mountDrumPerformance,drumStepIntervalMs} from '../src/drum-performance.js';
import {createTransportState,drumSequence} from '../src/transport-state.js';
import {drumStep} from '../src/sequencer-steps.js';
import {createMirrorSender} from '../src/sequencer-mirror.js';
import {fakeDom,fakeClock} from './fixtures/fake-dom.mjs';

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

// Drives the real drum performance on a fake clock shared by the page timer
// (milliseconds) and the audio clock (seconds), with the worklet shadow alongside.
function harness({lateMs=0}={}){
 const {$}=fakeDom({drumRate:{value:'4'},drumSync:{checked:true},drumBpm:{value:'120'}});
 const transport=createTransportState();
 const clock=fakeClock();
 clock.lateBy=lateMs;
 const audioTime=()=>clock.now()/1000;
 const worklet=createDrumShadow(RATE);
 const comparator=createShadowComparator({now:audioTime,post:message=>worklet.control(message,transport.getState(),Math.round(audioTime()*RATE))});
 const drum={step:0,timer:null,running:false};
 const played=[];
 const api=mountDrumPerformance({$,drum,transport,triggerDrumStep:hits=>played.push({at:clock.now(),lanes:hits.map(h=>h.lane).join(',')}),
  stopDrumVoices:()=>{},shadow:comparator,...clock});
 const deliver=()=>{
  worklet.advance(Math.round(audioTime()*RATE)+128,transport.getState());
  if(worklet.hasReport())comparator.receive(worklet.takeReport());
 };
 // Advances in 1 ms slices so the worklet reports alongside the page ticks.
 const run=ms=>{for(let i=0;i<ms;i++){clock.advance(1);deliver()}};
 return {$,api,comparator,transport,drum,clock,played,deliver,run};
}

test('page ticks and worklet steps match through a tempo restart; lateness is measured',()=>{
 const h=harness({lateMs:4});
 h.api.drumStart();
 h.run(15*125+10);
 let summary=h.comparator.summary();
 assert.equal(summary.compared,16);
 assert.equal(summary.hitsMatch,summary.compared);
 assert.ok(Math.abs(summary.lateMax-4)<0.05,'late '+summary.lateMax);
 assert.ok(Math.abs(summary.lateMin)<0.05,'the first tick is on time');
 // Restart at 1/8 between steps; the next tick comes one new interval later.
 h.clock.advance(20);
 h.transport.set({drum:{rate:2}});
 h.$('drumRate').dispatch('change');
 assert.equal(h.clock.delays.at(-1),250);
 h.run(8*250+100);
 summary=h.comparator.summary();
 assert.equal(summary.compared,16+8);
 assert.equal(summary.hitsMatch,summary.compared);
 assert.ok(Math.abs(summary.lateAvg-4*23/24)<0.05,'avg '+summary.lateAvg);
 assert.ok(summary.lastLeadMs>249&&summary.lastLeadMs<=250,'lead '+summary.lastLeadMs);
 assert.equal(summary.pageSkipped,0);
 h.api.drumStop();
 assert.equal(h.comparator.running,false);
 assert.equal(h.clock.pending,0,'stop cancels the timer');
 assert.match(formatDrumShadow(h.comparator.summary()),
  /^Drum shadow clock: 24 steps · hits match 24\/24 · page timer vs audio clock avg \+3\.8 ms, range \+0\.0 ms to \+4\.0 ms · start message lead \+250\.0 ms$/);
});

test('a short stall delays one step; the next step is back on the grid',()=>{
 const h=harness();
 h.api.drumStart();
 h.run(240);            // steps at 0 and 125 played; next due at 250
 h.clock.stall(70);     // busy page: the 250 ms step runs at 310
 h.run(400);
 assert.deepEqual(h.played.map(p=>p.at),[0,125,310,375,500,625]);
 const summary=h.comparator.summary();
 assert.equal(summary.pageSkipped,0);
 assert.equal(summary.hitsMatch,summary.compared);
 assert.ok(Math.abs(summary.lateMax-60)<0.05,'max '+summary.lateMax);
});

test('a stall longer than a step skips the passed steps instead of dragging the groove',()=>{
 const h=harness();
 h.api.drumStart();
 h.run(240);            // steps 0 (0 ms) and 1 (125 ms); step 2 due at 250
 h.clock.stall(320);    // page busy until 560: steps 2 (250) and 3 (375) have passed
 h.run(460);
 // One hit at 560 (step 4, due 500), then back on the grid: no catch-up burst.
 assert.deepEqual(h.played.map(p=>p.at),[0,125,560,625,750,875,1000]);
 assert.equal(h.drum.step,9,'steps 0,1,4,5,6,7,8 played; 9 is next');
 const summary=h.comparator.summary();
 assert.equal(summary.pageSkipped,2);
 assert.equal(summary.hitsMatch,summary.compared,'the skipped steps are not compared');
 assert.ok(summary.lateMax<125,'lateness stays under one step: '+summary.lateMax);
 assert.match(formatDrumShadow(summary),/ · page skipped 2 steps to stay in time$/);
});

test('the old setInterval behaviour would have dragged every later step',()=>{
 // Same stall as above, modelled as "next tick one interval after the last".
 const ticks=[0,125];let at=560;
 for(let k=0;k<5;k++){ticks.push(at);at+=125}
 const ideal=ticks.map((_,n)=>n*125);
 const late=ticks.map((t,n)=>t-ideal[n]);
 assert.deepEqual(late,[0,0,310,310,310,310,310]);
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

test('worklet drum timing: the run carries play:true and a 50 ms lead; page ticks only highlight',()=>{
 const {$}=fakeDom({drumRate:{value:'4'},drumSync:{checked:true},drumBpm:{value:'120'}});
 const transport=createTransportState();
 const clock=fakeClock();
 const audioTime=()=>clock.now()/1000;
 const worklet=createDrumShadow(RATE);
 const posted=[];
 const comparator=createShadowComparator({now:audioTime,post:message=>{posted.push(message);worklet.control(message,transport.getState(),Math.round(audioTime()*RATE))}});
 const drum={step:0,timer:null,running:false};
 let useWorklet=true;
 const steps=[];
 const api=mountDrumPerformance({$,drum,transport,triggerDrumStep:()=>steps.push({at:clock.now(),worklet:drum.worklet}),
  stopDrumVoices:()=>{},shadow:comparator,workletDrums:()=>useWorklet,...clock});
 const run=ms=>{for(let i=0;i<ms;i++){
  clock.advance(1);
  worklet.advance(Math.round(audioTime()*RATE)+128,transport.getState());
  if(worklet.hasReport())comparator.receive(worklet.takeReport());
 }};
 api.drumStart();
 assert.equal(drum.worklet,true);
 assert.deepEqual(posted.at(-1),{type:'sequencer-shadow',source:'drum',action:'run',run:1,step:0,firstAt:0.05,play:true});
 assert.deepEqual(steps,[],'no step at start: the first one is 50 ms ahead');
 run(50+3*125+10);
 assert.deepEqual(steps.map(s=>s.at),[50,175,300,425]);
 assert.ok(steps.every(s=>s.worklet));
 const summary=comparator.summary();
 assert.equal(summary.compared,4);
 assert.ok(Math.abs(summary.lateMax)<0.05,'page highlight and worklet steps share the grid');
 // 1/64 at 240 BPM is 15.6 ms: a restart still gives the worklet the full lead.
 transport.set({masterBpm:240,drum:{rate:16}});
 $('masterBpm').dispatch('change');
 assert.equal(posted.at(-1).play,true);
 assert.ok(Math.abs(posted.at(-1).firstAt-(audioTime()+0.05))<1e-9);
 // Turning the setting off: the next restart hands the drums back to the page.
 useWorklet=false;
 $('drumRate').dispatch('change');
 assert.equal(drum.worklet,false);
 assert.equal(posted.at(-1).play,false);
 api.drumStop();
 assert.deepEqual(posted.at(-1),{type:'sequencer-shadow',source:'drum',action:'stop'});
 assert.equal(drum.worklet,false);
});

test('without a shadow comparator the page always plays the drums',()=>{
 const {$}=fakeDom({drumRate:{value:'4'},drumSync:{checked:true},drumBpm:{value:'120'}});
 const clock=fakeClock();
 const drum={step:0,timer:null,running:false};
 const api=mountDrumPerformance({$,drum,transport:createTransportState(),triggerDrumStep:()=>{},stopDrumVoices:()=>{},workletDrums:()=>true,...clock});
 api.drumStart();
 assert.equal(drum.worklet,false);
 api.drumStop();
});
