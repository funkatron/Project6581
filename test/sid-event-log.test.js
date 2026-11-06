import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSidEventLog,formatSidDiagnosticReport} from '../src/sid-event-log.js';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';
import {closeSidContext} from '../src/sid-audio-lifecycle.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('disabled log does not call the clock; ring stays bounded and retains chronological order',()=>{
 let time=0;const log=createSidEventLog({capacity:3,now:()=>++time});
 assert.equal(log.begin('input',{}),null);log.add('context-state',{});assert.equal(time,0);
 log.setEnabled(true);
 for(let i=0;i<5;i++)log.begin('input',{note:60+i});
 const snapshot=log.snapshot();assert.equal(snapshot.overwritten,2);
 assert.deepEqual(snapshot.entries.map(e=>e.note),[62,63,64]);
 log.setEnabled(false);log.add('test');assert.equal(time,5);assert.equal(log.snapshot().entries.length,3);
 log.clear();log.setEnabled(true);assert.equal(log.begin('input',{}),6,'clearing never reuses IDs for late replies');
 const report=JSON.parse(formatSidDiagnosticReport(log,{build:'test'}));
 assert.equal(report.environment.build,'test');assert.equal(report.entries.length,1);
 assert.match(report.notice,/not physical speaker latency/);
});

test('write tags identify separate ranges without changing note-off microtask scheduling',()=>{
 const messages=[],jobs=[];const batch=createSidWriteBatcher(m=>messages.push(m),job=>jobs.push(job));
 batch.write(24,15); // unrelated filter write
 let start=batch.pendingCount;batch.write(4,65);batch.tag(1,start);
 start=batch.pendingCount;batch.write(4,64);batch.tag(2,start);
 assert.equal(messages.length,0);assert.equal(jobs.length,1);
 jobs.shift()();
 assert.deepEqual(messages[0],{type:'writes',writes:[[24,15],[4,65],[4,64]],diagnostics:[{eventId:1,start:1,end:2},{eventId:2,start:2,end:3}]});
 batch.write(4,65);batch.tag(3,0);batch.clearDiagnostics();batch.flush();
 assert.equal(messages[1].diagnostics,undefined);
 assert.equal(batch.tag(4,0),false,'no writes must not tag the next unrelated batch');
});

function processorHarness(){
 let Processor;const replies=[],writes=[];let renderSucceeds=true;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>replies.push(structuredClone(m))}},
  sampleRate:48000,currentFrame:1024,registerProcessor(_name,type){Processor=type}});
 vm.runInContext(readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8'),scope);
 const processor=new Processor();
 processor.exports={sid_write:(...write)=>writes.push(write),sid_render:n=>renderSucceeds?n:0,
  sid_pcm_ptr:()=>0,memory:{buffer:new ArrayBuffer(256)}};
 const send=data=>processor.port.onmessage({data});
 const render=()=>processor.process([],[ [new Float32Array(128),new Float32Array(128)] ]);
 return {processor,replies,writes,send,render,setRender:value=>{renderSucceeds=value}};
}

test('worklet acknowledges tagged events only after rendering; disabled/idle blocks send no event log',()=>{
 const h=processorHarness();h.send({type:'writes',writes:[[4,65]],diagnostics:[{eventId:1}]});h.render();
 assert.equal(h.replies.length,0);
 h.send({type:'event-log-enable',enabled:true});
 h.send({type:'writes',writes:[[4,64],[4,65]],diagnostics:[{eventId:2},{eventId:3}]});
 assert.equal(h.replies.length,0);h.setRender(false);h.render();assert.equal(h.replies.length,0);
 h.setRender(true);h.render();
 assert.deepEqual(h.replies[0],{type:'note-rendered',eventIds:[2,3],audioFrame:1024,frames:128,sampleRate:48000});
 h.render();assert.equal(h.replies.length,1);
 h.send({type:'writes',writes:[[4,64]],diagnostics:[{eventId:4}]});
 h.send({type:'event-log-enable',enabled:false});h.render();assert.equal(h.replies.length,1);
 assert.deepEqual(h.writes,[[4,65],[4,64],[4,65],[4,64]]);
});

test('worklet pending event IDs are bounded when rendering stalls',()=>{
 const h=processorHarness();h.send({type:'event-log-enable',enabled:true});
 h.send({type:'writes',writes:[[4,65]],diagnostics:Array.from({length:300},(_,eventId)=>({eventId}))});
 assert.equal(h.processor.pendingNoteEvents.length,128);
 h.send({type:'event-log-enable',enabled:false});assert.equal(h.processor.pendingNoteEvents.length,0);
});

async function bridgeHarness(){
 let node,time=100;const messages=[],jobs=[];
 const eventLog=createSidEventLog({now:()=>time});eventLog.setEnabled(true);
 const context={state:'running',resume:async()=>{},audioWorklet:{addModule:async()=>{}},destination:{},close:async()=>{context.state='closed'}};
 class Node{constructor(){node=this;this.port={postMessage:m=>messages.push(m),close(){}}}connect(){}disconnect(){}}
 const scope=vm.createContext({AbortController,AudioWorkletNode:Node,closeSidContext,setTimeout,clearTimeout,
  createSidWriteBatcher:post=>createSidWriteBatcher(post,job=>jobs.push(job)),performance:{now:()=>time},
  fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}),WebAssembly:{compile:async()=>({}),Module:{imports:()=>[]}}});
 const source=readFileSync(new URL('../src/create-residfp-audio.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
 vm.runInContext(source,scope);const audio=await scope.createReSidFpAudio({context,eventLog,contextId:7});
 return {audio,eventLog,messages,jobs,reply:data=>node.port.onmessage({data}),setTime:value=>{time=value}};
}

test('bridge correlates on/off dispatch and rendered acknowledgments and ignores stale replies',async()=>{
 const h=await bridgeHarness();h.audio.setEventLogging(true);
 assert.equal(h.eventLog.snapshot().entries[0].type,'sid-worklet-connected');
 assert.equal(h.messages.find(message=>message.type==='load').traceFirstRender,true);
 h.reply({type:'sid-first-render',audioFrame:0,frames:128,sampleRate:48000});
 assert.equal(h.eventLog.snapshot().entries.at(-1).type,'sid-first-render');
 h.eventLog.clear();
 const inputId=h.eventLog.begin('input',{note:60,action:'down'});
 const onId=h.eventLog.begin('note-command',{note:60,action:'on',inputEventId:inputId});
 let start=h.audio.beginNoteTrace();h.audio.write(4,65);h.audio.endNoteTrace(onId,start);h.audio.noteDispatched();
 assert.equal(h.messages.at(-1).diagnostics[0].eventId,onId);
 h.setTime(105);h.reply({type:'note-rendered',eventIds:[onId],audioFrame:128,frames:128,sampleRate:48000});
 let rows=h.eventLog.snapshot().entries;
 assert.deepEqual(rows.map(e=>e.type),['input','note-command','sid-dispatch','render-acknowledged']);
 assert.deepEqual(rows[2].writes,[[4,65]]);assert.equal(rows[3].dispatchToAckMs,5);assert.equal(rows[3].contextId,7);
 const offId=h.eventLog.begin('note-command',{note:60,action:'off'});
 start=h.audio.beginNoteTrace();h.audio.write(4,64);h.audio.endNoteTrace(offId,start);
 assert.equal(h.messages.at(-1).diagnostics[0].eventId,onId,'off is still pending');
 while(h.jobs.length)h.jobs.shift()();assert.equal(h.messages.at(-1).diagnostics[0].eventId,offId);
 h.audio.setEventLogging(false);h.audio.setEventLogging(true);
 const count=h.eventLog.snapshot().entries.length;
 h.reply({type:'note-rendered',eventIds:[offId],audioFrame:256,frames:128,sampleRate:48000});
 assert.equal(h.eventLog.snapshot().entries.length,count);
 await h.audio.close();
 assert.deepEqual(h.eventLog.snapshot().entries.slice(-2).map(e=>e.type),['sid-worklet-disconnected','sid-context-closed']);
});

test('bridge caps unanswered events and expires old ones without delaying playback',async()=>{
 const h=await bridgeHarness();h.audio.setEventLogging(true);
 const dispatch=id=>{const start=h.audio.beginNoteTrace();h.audio.write(4,65);h.audio.endNoteTrace(id,start);h.audio.noteDispatched()};
 for(let id=1;id<=130;id++)dispatch(id);
 assert.equal(h.eventLog.snapshot().entries.filter(e=>e.type==='ack-evicted').length,2);
 h.setTime(4000);dispatch(131);
 assert.equal(h.eventLog.snapshot().entries.filter(e=>e.type==='ack-expired').length,128);
 await h.audio.close();
});

test('actual app note commands retain their physical input parent and tag on/off writes',()=>{
 const log=createSidEventLog();log.setEnabled(true);const tagged=[];
 const scope=vm.createContext({sidEventLog:log,sidInputEvent:null,sidContext:{state:'running'},settings:[{enabled:true}],activeSeqStep:-1,
  sidController:{noteOn:()=>1,noteOff(){}},sidAudio:{beginNoteTrace:()=>0,endNoteTrace:id=>tagged.push(id),noteDispatched(){}}});
 const trace=html.slice(html.indexOf('function traceInput('),html.indexOf('let sidController=null,'));
 const notes=html.slice(html.indexOf('const activeOwners=new Map();'),html.indexOf('function updateUnison(){'));
 vm.runInContext(trace+'\n'+notes,scope);
 scope.traceInput(60,'pointer','down',()=>scope.play(60));
 scope.traceInput(60,'pointer','pointerup',()=>scope.stop(60));
 scope.play(64,'game');
 const entries=log.snapshot().entries;
 assert.equal(entries[1].inputEventId,entries[0].eventId);assert.equal(entries[3].inputEventId,entries[2].eventId);
 assert.equal(entries[4].inputEventId,null);assert.equal(entries[4].source,'game');
 assert.deepEqual(tagged,[entries[1].eventId,entries[3].eventId,entries[4].eventId]);
});

test('Copy diagnostic report exports a snapshot and provides selectable text if clipboard fails',async()=>{
 const callbacks=new Map(),elements=new Map();let copied=null,fail=false;
 const $=id=>{
  if(!elements.has(id))elements.set(id,{textContent:id==='buildInfo'?'test build':'',hidden:true,value:'',
   addEventListener:(_type,fn)=>callbacks.set(id,fn),focus(){this.focused=true},select(){this.selected=true}});
  return elements.get(id);
 };
 const log=createSidEventLog();log.setEnabled(true);log.begin('input',{note:60});
 $('chip').value='8580';
 const source=html.slice(html.indexOf("$('sidCopyReport').addEventListener"),html.indexOf('function traceInput('));
 const scope=vm.createContext({$,sidEventLog:log,formatSidDiagnosticReport,activeSidModel:6581,sidContext:{state:'running',sampleRate:48000,baseLatency:0.01},
  navigator:{userAgent:'test browser',clipboard:{writeText:async text=>{if(fail)throw Error('denied');copied=text}}},
  location:{pathname:'/pr-59/'},audioTiming:{},sidStartupLog:['ready']});
 vm.runInContext(source,scope);await callbacks.get('sidCopyReport')();
 const report=JSON.parse(copied);assert.equal(report.environment.baseLatencyMs,10);assert.equal(report.entries[0].note,60);
 assert.equal(report.environment.selectedSidModel,8580);assert.equal(report.environment.activeSidModel,6581);
 assert.equal($('sidReportFallback').hidden,true);assert.match($('sidCopyStatus').textContent,/copied/);
 fail=true;await callbacks.get('sidCopyReport')();
 assert.equal($('sidReportFallback').hidden,false);assert.equal($('sidReportFallback').selected,true);
 assert.equal(JSON.parse($('sidReportFallback').value).environment.route,'/pr-59/');
});


test('startup trace reports only the first successful SID render',()=>{
 const h=processorHarness();
 h.processor.traceFirstRender=true;
 h.setRender(false);h.render();
 assert.deepEqual(h.replies,[]);
 h.setRender(true);h.render();h.render();
 assert.deepEqual(h.replies,[{type:'sid-first-render',audioFrame:1024,frames:128,sampleRate:48000}]);
});
