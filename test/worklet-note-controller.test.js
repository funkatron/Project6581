import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UnisonSidController} from '../src/unison-sid-controller.js';
import {createNoteControllerProxy,createWorkletNoteController,workletNotesSupported,NOTE_OP} from '../src/worklet-note-controller.js';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';
import {createDefaultEngines} from '../src/sid-engines.js';
import {simplePitchEnvelope} from '../src/pitch-envelope.js';
import {workletNotesRequested,WORKLET_NOTES_KEY} from '../src/studio-preferences-ui.js';
import {formatNoteController} from '../src/audio-timing-panel.js';

// Step G2: with the worklet note controller on, the page's controller calls
// become ops; the worklet's controller must make exactly the writes, pitch
// messages and drum evictions the page's own controller makes today.

const pageRegister=slot=>Math.floor(slot/3)*0x20+(slot%3)*7;
const pageFrequency=note=>Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));

function makeVoices(){
 const engines=createDefaultEngines();
 const voices=engines.map(engine=>({...engine.voice}));
 voices[1]={...voices[1],wave:'sawtooth',attack:0.03,release:0.4};
 voices[2]={...voices[2],pitchEnvelope:simplePitchEnvelope(true,12,80)};
 return voices;
}

// The page today: create-residfp-audio.js turns pitch callbacks into these messages.
function direct(options,log){
 return new UnisonSidController((register,value)=>log.push(['write',register,value]),{...options,
  onPitchStart:(slot,note,envelope)=>log.push(['pitch-start',pageRegister(slot),pageFrequency(note),envelope.points,envelope.interpolation,envelope.end]),
  onPitchRetune:(slot,note)=>log.push(['pitch-retune',pageRegister(slot),pageFrequency(note)]),
  onPitchStop:slot=>log.push(['pitch-stop',pageRegister(slot)]),
  onDrumNoteEvicted:note=>log.push(['evicted',note])});
}

// With G2: proxy on the page → structured clone (postMessage) → worklet controller.
function viaWorklet(options,log){
 const worklet=createWorkletNoteController({
  write:(register,value)=>log.push(['write',register,value]),
  startPitchEnvelope:c=>log.push(['pitch-start',c.register,c.baseFrequency,c.points,c.interpolation,c.end]),
  retunePitchEnvelope:c=>log.push(['pitch-retune',c.register,c.baseFrequency]),
  stopPitchEnvelope:c=>log.push(['pitch-stop',c.register])
 });
 const evicted=[];
 const proxy=createNoteControllerProxy(op=>worklet.apply(structuredClone(op)),{...options,onDrumNoteEvicted:note=>evicted.push(note)});
 return {proxy,worklet,evicted};
}

/**
 * Runs one script on both paths. Each step is (controller, settingsGetter, state) => token|void.
 * The getter reads mutable page state, as sid-studio.js voiceSettingsForSlot does.
 */
function assertParity(options,script){
 const pageLog=[],workletLog=[];
 const page=direct(options,pageLog);
 const {proxy,worklet,evicted}=viaWorklet(options,workletLog);
 const stateA={voices:makeVoices(),tokens:new Map()},stateB={voices:makeVoices(),tokens:new Map()};
 const getterFor=state=>slot=>state.voices[Math.floor(slot/3)];
 script.forEach((step,index)=>{
  const a=pageLog.length,b=workletLog.length;
  const ta=step(page,getterFor(stateA),stateA),tb=step(proxy,getterFor(stateB),stateB);
  assert.equal(tb,ta,'token at step '+index);
  const pageStep=pageLog.slice(a).filter(entry=>entry[0]!=='evicted');
  assert.deepEqual(workletLog.slice(b),pageStep,'writes at step '+index);
 });
 assert.deepEqual(evicted,pageLog.filter(entry=>entry[0]==='evicted').map(entry=>entry[1]),'drum evictions reach the page');
 assert.equal(worklet.takeStats().errors,0);
 assert.ok(pageLog.some(entry=>entry[0]==='write'),'the script made writes');
 return {pageLog,proxy};
}

const on=(note,routing)=>(c,get,s)=>{const token=c.noteOn(note,get,routing);s.tokens.set(note,token);return token};
const off=note=>(c,_get,s)=>{c.noteOff(note,s.tokens.get(note))};
const offAny=note=>c=>{c.noteOff(note)};

test('mono, legato, duo and poly with unison and detune: same writes, tokens and pitch messages',()=>{
 for(const mode of ['mono','legato','duo','poly']){
  assertParity({voiceCount:6,unisonCount:2,mode,detune:30},[
   on(60),on(64),on(67),c=>{c.setLiveDetune(55)},off(64),on(72),offAny(60),off(67),off(72),c=>{c.panic()}
  ]);
 }
});

test('mono fallback calls the stored getter later: the worklet gets the settings the page reads then',()=>{
 assertParity({voiceCount:3,unisonCount:3,mode:'mono',detune:20},[
  on(60),on(62),
  // The player edits SID 1 while both keys are held; releasing 62 retriggers 60 with the new sound.
  (_c,_get,s)=>{s.voices[0]={...s.voices[0],wave:'sawtooth',attack:0.5}},
  off(62),off(60)
 ]);
});

test('layer routes, a pitch envelope on SID 3 and per-chip envelope, pulse and filter edits',()=>{
 assertParity({voiceCount:9,unisonCount:1,mode:'poly',detune:0},[
  on(48,{chipMask:[0,1,2]}),
  on(60,{chipMask:[2],layerChip:2}),on(62,{chipMask:[2],layerChip:2}),
  on(55,{chipMask:[1],layerChip:1}),
  c=>{c.setEnvelope({attack:0.1,decay:0.3,sustain:0.5,release:0.6},1)},
  c=>{c.setPulse(0,25,0)},c=>{c.setEnvelope({attack:0.2,decay:0.2,sustain:0.2,release:0.2})},c=>{c.setPulse(0,70)},
  c=>{c.setFilter({cutoff:900,resonance:8,routing:7,mode:'bandpass',volume:12},1)},
  c=>{c.setFilter({cutoff:1500,resonance:0,routing:7,mode:'lowpass',volume:15})},
  off(60),off(48),off(55),off(62)
 ]);
});

test('drum lanes on SID 4–6: retrigger and slot eviction still clear the page owner',()=>{
 const kick={wave:'triangle',attack:0,decay:0.01,sustain:0,release:0.01};
 const drum=(note,chip)=>(c,_get,s)=>{const token=c.noteOn(note,()=>kick,{chipMask:[chip],layerChip:chip,drumSlot:0});s.tokens.set(note,token);return token};
 const {pageLog}=assertParity({voiceCount:1,unisonCount:1,mode:'mono'},[
  drum(36,3),drum(38,3),drum(42,5),drum(42,5),off(42),drum(36,3),
  c=>{c.setFilter({cutoff:700,resonance:4,routing:1,mode:'lowpass',volume:15},3)}
 ]);
 assert.ok(pageLog.some(entry=>entry[0]==='evicted'),'the script evicted a drum note');
});

test('configure, panic and forceSilent go through in order',()=>{
 const {proxy}=assertParity({voiceCount:4,unisonCount:2,mode:'poly',detune:10},[
  on(60),on(64),
  c=>{c.configure({voiceCount:4,unisonCount:2,mode:'poly',detune:40})},
  c=>{c.configure({voiceCount:2,unisonCount:1,mode:'mono',detune:0})},
  on(67),c=>{c.forceSilent()},on(69),c=>{c.panic()}
 ]);
 assert.equal(proxy.mode,'mono');assert.equal(proxy.voiceCount,2);assert.equal(proxy.worklet,true);
});

test('unison layers send one settings object and indexes',()=>{
 const ops=[];
 const proxy=createNoteControllerProxy(op=>ops.push(op),{voiceCount:9,unisonCount:9,mode:'mono'});
 const voice={wave:'square',attack:0,decay:0.1,sustain:0.5,release:0.1,pulse:50};
 proxy.noteOn(60,()=>voice);
 assert.deepEqual(ops.map(op=>op.op),['init','noteOn']);
 assert.equal(ops[0].type,NOTE_OP);
 assert.equal(ops[1].settings.length,1);
 assert.deepEqual(ops[1].calls,Array(9).fill(0));
 assert.equal(ops[1].token,1);
});

test('a settings count the worklet disagrees with is an error, not a silent wrong note',()=>{
 const worklet=createWorkletNoteController({write:()=>{}});
 worklet.apply({type:NOTE_OP,op:'init',options:{voiceCount:2,unisonCount:2,mode:'mono'}});
 assert.throws(()=>worklet.apply({type:NOTE_OP,op:'noteOn',note:60,token:1,options:{},settings:[{}],calls:[0]}),/fewer voice settings/);
 assert.throws(()=>worklet.apply({type:NOTE_OP,op:'noteOn',note:62,token:2,options:{},settings:[{}],calls:[0,0,0]}),/sent 3 voice settings, worklet used 2/);
 assert.throws(()=>worklet.apply({type:NOTE_OP,op:'noteOn',note:64,options:{},settings:[{}],calls:[0,0]}),/without a token/);
 const stats=worklet.takeStats();
 assert.equal(stats.errors,3);assert.match(stats.lastError,/token/);
 assert.equal(worklet.takeStats().errors,0);
 const fresh=createWorkletNoteController({write:()=>{}});
 assert.throws(()=>fresh.apply({type:NOTE_OP,op:'panic'}),/before init/);
});

test('the batcher keeps ops in order with the register writes around them',()=>{
 const posted=[];
 const batcher=createSidWriteBatcher(message=>posted.push(message),()=>{});
 batcher.write(0x18,15);
 const op={type:NOTE_OP,op:'panic'};
 batcher.op(op);batcher.write(0x38,15);
 assert.equal(batcher.pendingCount,3);
 batcher.flush();
 assert.deepEqual(posted,[{type:'writes',writes:[[0x18,15],op,[0x38,15]]}]);
});

test('the worklet processor applies ops at block start, in order with page writes, and reports stats',async()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const {default:sequencer}=await import('../src/sequencer-worklet-modules.js');
 assert.equal(sequencer.version,8);
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:48000,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 scope.project6581Sequencer=sequencer;
 vm.runInContext(source,scope);
 const processor=new Processor();
 const writes=[];
 const memory=new WebAssembly.Memory({initial:1});
 processor.exports={memory,sid_write:(register,value)=>writes.push([register,value]),sid_render:frames=>frames,sid_pcm_ptr:()=>0};
 // What the page sends: the proxy's ops through a batcher, between plain writes.
 const posted=[];
 const batcher=createSidWriteBatcher(message=>posted.push(structuredClone(message)),()=>{});
 const proxy=createNoteControllerProxy(op=>batcher.op(op),{voiceCount:1,unisonCount:1,mode:'mono'});
 const voices=makeVoices();
 batcher.write(0x18,0x1f);
 const token=proxy.noteOn(50,slot=>voices[Math.floor(slot/3)],{chipMask:[2],layerChip:2});
 batcher.write(0x58,0x1f);
 batcher.flush();
 for(const message of posted.splice(0))processor.port.onmessage({data:message});
 assert.deepEqual(writes,[],'nothing is written before the block');
 const block=[new Float32Array(128),new Float32Array(128)];
 processor.process([],[block]);
 const expected=[];
 const page=direct({voiceCount:1,unisonCount:1,mode:'mono'},expected);
 page.noteOn(50,slot=>voices[Math.floor(slot/3)],{chipMask:[2],layerChip:2});
 const noteWrites=expected.filter(entry=>entry[0]==='write').map(entry=>[entry[1],entry[2]]);
 assert.deepEqual(writes.slice(0,noteWrites.length+2),[[0x18,0x1f],...noteWrites,[0x58,0x1f]]);
 // SID 3 voice 1 carries a pitch envelope; it starts in the same block.
 assert.ok(processor.pitchEnvelopes.has(0x40));
 assert.equal(processor.pitchEnvelopes.get(0x40).startFrame,0);
 proxy.noteOff(50,token);batcher.flush();
 for(const message of posted.splice(0))processor.port.onmessage({data:message});
 for(let i=0;i<127;i++){scope.currentFrame+=128;processor.process([],[block])}
 assert.equal(processor.pitchEnvelopes.has(0x40),false);
 const status=messages.find(m=>m.type==='note-controller-status');
 assert.equal(status.ops,3);assert.equal(status.errors,0);assert.equal(status.missing,0);
 assert.ok(status.writes>=noteWrites.length+1);
});

test('without the worklet API, ops are counted as dropped',()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:48000,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 vm.runInContext(source,scope);
 const processor=new Processor();
 processor.exports={memory:new WebAssembly.Memory({initial:1}),sid_write(){},sid_render:frames=>frames,sid_pcm_ptr:()=>0};
 processor.port.onmessage({data:{type:'writes',writes:[{type:NOTE_OP,op:'panic'}]}});
 const block=[new Float32Array(128)];
 for(let i=0;i<128;i++){scope.currentFrame+=128;processor.process([],[block])}
 assert.equal(messages.find(m=>m.type==='note-controller-status').missing,1);
});

test('off by default; ?workletNotes=1|0 turns it on or off and is remembered',()=>{
 const store=new Map();
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 assert.equal(workletNotesRequested({search:'',storage}),false);
 assert.equal(workletNotesRequested({search:'?workletNotes=1',storage}),true);
 assert.equal(store.get(WORKLET_NOTES_KEY),'on');
 assert.equal(workletNotesRequested({search:'',storage}),true);
 assert.equal(workletNotesRequested({search:'?workletNotes=0',storage}),false);
 assert.equal(workletNotesRequested({search:'',storage}),false);
 const broken={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){}};
 assert.equal(workletNotesRequested({search:'?workletNotes=1',storage:broken}),true);
 assert.equal(workletNotesRequested({search:'',storage:broken}),false);
});

test('only bundle API v8 with a passing self-test runs note ops; the panel says who writes notes',()=>{
 assert.equal(workletNotesSupported({available:true,version:8,selfTest:{ok:true}}),true);
 assert.equal(workletNotesSupported({available:true,version:7,selfTest:{ok:true}}),false);
 assert.equal(workletNotesSupported({available:true,version:8,selfTest:{ok:false}}),false);
 assert.equal(workletNotesSupported(null),false);
 assert.equal(formatNoteController(null),'Note writes: page');
 assert.match(formatNoteController({requested:true,active:false}),/requested; waiting for or missing/);
 assert.equal(formatNoteController({active:true,ops:12,writes:80}),'Note writes: worklet note controller (12 ops, 80 writes)');
 assert.match(formatNoteController({active:true,ops:1,writes:0,errors:2,lastError:'x',missing:1}),/2 errors \(last: x\), 1 ops dropped/);
});

test('after a lost op (model switch clears the queue), later notes still match the page tokens',()=>{
 const log=[];
 const worklet=createWorkletNoteController({write:(register,value)=>log.push([register,value])});
 let drop=false;
 const proxy=createNoteControllerProxy(op=>{if(!drop)worklet.apply(structuredClone(op))},{voiceCount:3,unisonCount:1,mode:'poly'});
 const voice={wave:'sawtooth',attack:0,decay:0.1,sustain:0.5,release:0.1};
 drop=true;proxy.noteOn(60,()=>voice);drop=false;
 const token=proxy.noteOn(64,()=>voice);
 assert.equal(token,2);
 log.length=0;
 proxy.noteOff(64,token);
 assert.deepEqual(log,[[4,0x20]],'the page token releases the worklet note');
});
