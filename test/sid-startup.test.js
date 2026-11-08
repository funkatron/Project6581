import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {closeSidContext} from '../src/sid-audio-lifecycle.js';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const startup=html.slice(html.indexOf('function updateSidLed(){'),html.indexOf('async function stopAndSaveRecording(){'))
 .replaceAll('import(', 'loadModule(');
const unlock=html.slice(html.indexOf('function unlockSidAudio(){'),html.indexOf("document.addEventListener('pointerdown',unlockSidAudio"));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};

function app({closeHangs=false,closeRejects=false,moduleHang=false,engineError=false,closedBeforeSettled=false,earlyError=false}={}){
 const elements=new Map(),contexts=[],attempts=[],timers=new Map();let timerId=0;
 const $=id=>{
  if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,textContent:'',value:id==='chip'?'6581':'1',dataset:{},setAttribute(){},querySelector(){return {disabled:false}}});
  return elements.get(id);
 };
 class Context{
  state='suspended';resumeCalls=0;closeCalls=0;onstatechange=null;
  constructor(){contexts.push(this);this.resumeResult=deferred()}
  resume(){this.resumeCalls++;return this.resumeResult.promise}
  close(){this.closeCalls++;if(closeRejects)return Promise.reject(Error('close rejected'));if(closeHangs){if(closedBeforeSettled)this.state='closed';return new Promise(()=>{})};this.state='closed';return Promise.resolve()}
 }
 const lifecycle=readFileSync(new URL('../src/sid-audio-lifecycle.js',import.meta.url),'utf8').replace('export function','function');
 const statusUi=readFileSync(new URL('../src/sid-engine-status-ui.js',import.meta.url),'utf8').replace(/export function/g,'function');
 const scope=vm.createContext({$,AudioContext:Context,performance:{now:()=>0},
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),
  sidAudio:null,sidContext:null,sidController:null,sidRecorder:null,activeSidModel:null,sidStarting:false,
  sidEventLog:{enabled:false,add(){}},sidKeys:0,lfoTimer:1,modulation:null,sidStartupLog:[],audioTiming:{},
  panic(){},updateModulation(){},updateAudioTimingReport(){},createSidRecorder:()=>({supportsM4a:false}),
  stopAndSaveRecording(){},
  loadModule:async path=>moduleHang?new Promise(()=>{}):path.includes('create-residfp')?{createReSidFpAudio:async options=>{
   if(engineError)throw Error('SID engine download failed');
   const audio={context:options.context,write(){},setTimingEnabled(){},setEventLogging(){},close:()=>scope.closeSidContext(options.context)};
   attempts.push({options,audio});
   if(earlyError){options.onStatus({type:'ready',renderer:true});options.onStatus({type:'error',message:'failed after ready'})}
   return audio;
  }}:path.includes('unison')?{UnisonSidController:class{}}:{},
 });
 vm.runInContext(statusUi+'\n'+lifecycle+'\n'+startup+'\n'+unlock,scope);
 const fire=ms=>{for(const [id,timer] of [...timers])if(timer.ms===ms){timers.delete(id);timer.fn()}};
 return {scope,$,contexts,attempts,timers,fire};
}

test('startup creates/resumes synchronously, deduplicates calls and becomes ready while suspended',async()=>{
 const a=app(),first=a.scope.startSid(),second=a.scope.startSid();
 assert.equal(a.contexts.length,1);assert.equal(a.contexts[0].resumeCalls,1);
 await settle();assert.equal(a.attempts.length,1);
 a.attempts[0].options.onStatus({type:'ready',renderer:true});await Promise.all([first,second]);
 assert.equal(a.$('sidSpinner').hidden,true);assert.equal(a.$('sidUnlock').hidden,false);
 assert.match(a.$('sidEngineStatus').textContent,/touch a key/);assert.equal(a.timers.size,0);
});

test('readiness timeout cleans up, shows Retry, and stale callbacks cannot affect the retry',async()=>{
 const a=app();let pending=a.scope.startSid();await settle();
 const old=a.attempts[0].options;
 old.onProgress('Instantiating SID WebAssembly…');a.fire(12000);await pending;
 assert.equal(a.contexts[0].state,'closed');assert.equal(a.$('sidSpinner').hidden,true);
 assert.match(a.$('sidEngineStatus').textContent,/timed out at: Instantiating/);
 assert.equal(a.$('sidStart').disabled,false);
 pending=a.scope.startSid();await settle();assert.equal(a.contexts.length,2);
 old.onProgress('obsolete');old.onStatus({type:'error',message:'obsolete'});
 a.contexts[0].resumeResult.reject(Error('obsolete resume'));await settle();
 assert.doesNotMatch(a.$('sidEngineStatus').textContent,/obsolete/);
 a.attempts[1].options.onStatus({type:'ready',renderer:true});await pending;
 assert.equal(a.scope.sidAudio,a.attempts[1].audio);assert.equal(a.timers.size,0);
});

test('stalled close clears spinner within cleanup deadline and blocks new contexts',async()=>{
 const a=app({closeHangs:true});const pending=a.scope.startSid();await settle();
 a.fire(12000);await settle();a.fire(2000);await pending;
 assert.equal(a.$('sidSpinner').hidden,true);assert.equal(a.$('sidStart').disabled,true);
 assert.match(a.$('sidEngineStatus').textContent,/cleanup timed out/);
 await a.scope.startSid();assert.equal(a.contexts.length,1);
});

test('closed state alone cannot authorize retry while browser resource cleanup never settles',async()=>{
 const a=app({closeHangs:true,closedBeforeSettled:true});const pending=a.scope.startSid();await settle();
 a.fire(12000);await settle();assert.equal(a.contexts[0].state,'closed');
 a.fire(2000);await pending;assert.equal(a.$('sidStart').disabled,true);
 await a.scope.startSid();assert.equal(a.contexts.length,1);assert.equal(a.$('sidSpinner').hidden,true);
});

test('rejected cleanup also blocks new contexts and preserves failure detail',async()=>{
 const a=app({closeRejects:true});const pending=a.scope.startSid();await settle();
 a.attempts[0].options.onStatus({type:'error',message:'WASM failure'});await pending;
 assert.match(a.$('sidEngineStatus').textContent,/WASM failure; close rejected/);
 assert.equal(a.$('sidSpinner').hidden,true);await a.scope.startSid();assert.equal(a.contexts.length,1);
});

test('trusted activation resumes pending initialization; stale resume never overwrites retry status',async()=>{
 const a=app();const pending=a.scope.startSid();await settle();
 a.scope.unlockSidAudio();assert.equal(a.contexts[0].resumeCalls,2);
 a.fire(12000);await pending;
 const retry=a.scope.startSid();await settle();
 a.contexts[0].resumeResult.resolve();await settle();
 assert.match(a.$('sidEngineStatus').textContent,/Loading SID JavaScript modules/);
 const context=a.contexts[1];context.state='running';context.resumeResult.resolve();context.onstatechange();
 a.attempts[1].options.onStatus({type:'ready',renderer:true});await retry;
 assert.equal(a.$('sidUnlock').hidden,true);assert.match(a.$('sidEngineStatus').textContent,/active/);
});

test('processor failure after readiness retires the engine and allows a single clean retry',async()=>{
 const a=app();const pending=a.scope.startSid();await settle();
 a.attempts[0].options.onStatus({type:'ready',renderer:true});await pending;
 a.attempts[0].options.onStatus({type:'error',message:'processor crashed'});await settle();
 assert.equal(a.scope.sidAudio,null);assert.equal(a.contexts[0].closeCalls,1);
 assert.equal(a.$('recordToggle').disabled,true);assert.equal(a.$('sidStart').disabled,false);
 assert.match(a.$('sidEngineStatus').textContent,/processor crashed/);
});

test('module timeout and early engine failure both close their contexts and expose retry',async()=>{
 for(const config of [{moduleHang:true},{engineError:true}]){
  const a=app(config),pending=a.scope.startSid();await settle();
  if(config.moduleHang)a.fire(15000);await pending;
  assert.equal(a.contexts[0].state,'closed');assert.equal(a.$('sidSpinner').hidden,true);
  assert.equal(a.$('sidStart').disabled,false);assert.equal(a.timers.size,0);
  assert.match(a.$('sidEngineStatus').textContent,config.moduleHang?/module loading timed out/:/download failed/);
 }
});

test('context close is idempotent',async()=>{
 let calls=0;const gate=deferred();const context={state:'suspended',close(){calls++;return gate.promise}};
 const first=closeSidContext(context),second=closeSidContext(context);
 assert.equal(first,second);assert.equal(calls,1);context.state='closed';gate.resolve();await first;
 await closeSidContext(context);assert.equal(calls,1);
});

test('bridge forwards progress/errors, preserves note flushing and silences obsolete port handlers',async()=>{
 const statuses=[],progress=[],messages=[];let node;
 const context={state:'suspended',resume:()=>new Promise(()=>{}),audioWorklet:{addModule:async()=>{}},destination:{},close:async()=>{context.state='closed'}};
 class Node{
  constructor(){node=this;this.port={postMessage:m=>messages.push(m),close(){}}}
  connect(){}disconnect(){this.disconnected=true}
 }
 const source=readFileSync(new URL('../src/create-residfp-audio.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export async function','async function');
 const scope=vm.createContext({AbortController,AudioWorkletNode:Node,createSidWriteBatcher,closeSidContext,setTimeout,clearTimeout,
  performance,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}),WebAssembly:{compile:async()=>({}),Module:{imports:()=>[]}}});
 vm.runInContext(source,scope);
 const audio=await scope.createReSidFpAudio({context,onStatus:e=>statuses.push(e),onProgress:m=>progress.push(m)});
 const old=node.port.onmessage;
 old({data:{type:'init-progress',message:'Instantiating'}});assert.equal(progress.at(-1),'Instantiating');
 node.onprocessorerror();assert.match(statuses.at(-1).message,/stopped unexpectedly/);
 audio.write(4,65);audio.noteDispatched();assert.equal(messages.at(-1).type,'writes');
 await audio.close();const count=statuses.length;
 old({data:{type:'ready',renderer:true}});assert.equal(statuses.length,count);
 assert.equal(node.port.onmessage,null);assert.equal(node.onprocessorerror,null);assert.equal(node.disconnected,true);
});

test('worklet acknowledges each initialization stage and reports WASM rejection',async()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const messages=[];let Processor;let reject=false;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:48000,
  WebAssembly:{instantiate:async()=>{if(reject)throw Error('bad WASM');return {instance:{exports:{memory:{},sid_init:()=>1,sid_write(){},sid_render(){},sid_pcm_ptr(){}}}}}},
  registerProcessor(_name,type){Processor=type}});
 vm.runInContext(source,scope);const processor=new Processor();await processor.load(new ArrayBuffer(0),6581);
 assert.deepEqual(messages.map(m=>m.type),[...Array(6).fill('init-progress'),'ready']);
 assert.match(messages[1].message,/Instantiating/);assert.match(messages[4].message,/chip/);
 reject=true;await processor.load(new ArrayBuffer(0),6581);assert.equal(messages.at(-1).type,'error');assert.match(messages.at(-1).message,/bad WASM/);
});

test('gestures cannot resume a retired context during or after stalled cleanup',async()=>{
 const a=app({closeHangs:true}),pending=a.scope.startSid();await settle();
 a.fire(12000);await settle();a.scope.unlockSidAudio();assert.equal(a.contexts[0].resumeCalls,1);
 a.fire(2000);await pending;a.scope.unlockSidAudio();assert.equal(a.contexts[0].resumeCalls,1);
});

test('error after ready but before factory return prevents assigning a failed engine',async()=>{
 const a=app({earlyError:true});await a.scope.startSid();
 assert.equal(a.scope.sidAudio,null);assert.equal(a.contexts[0].state,'closed');
 assert.match(a.$('sidEngineStatus').textContent,/failed after ready/);
 assert.equal(a.$('sidSpinner').hidden,true);
});
