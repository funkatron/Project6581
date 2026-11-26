import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {
 emptyMirror,applyMirrorMessage,mirrorDigest,mirrorSummary,createMirrorSender,transportPatch,
 compareMirrorStatus,formatSequencerMirror
} from '../src/sequencer-mirror.js';
import {createTransportState} from '../src/transport-state.js';
import {createDefaultEngines} from '../src/sid-engines.js';

const engines=createDefaultEngines(6581);
const voice=chip=>({...engines[chip].voice});
const lane={note:84,level:100,voice:{wave:'triangle+noise',attack:0,decay:0,sustain:0,release:.02},filter:{cutoff:2583,resonance:100,volume:100,mode:'lowpass'}};
const instrument={voiceCount:9,unisonCount:3,mode:'poly',detune:24};

function harness(){
 const sent=[];
 const sender=createMirrorSender(message=>sent.push(structuredClone(message)));
 let worklet=emptyMirror();
 const deliver=()=>{for(const message of sent.splice(0))worklet=applyMirrorMessage(worklet,message)};
 return {sent,sender,deliver,get worklet(){return worklet}};
}

test('the worklet rebuilds the page mirror; digests match at every revision',()=>{
 const h=harness(),transport=createTransportState();
 h.sender.reset();
 h.sender.syncTransport(transport.getState());
 for(let chip=0;chip<3;chip++)h.sender.syncVoice(chip,voice(chip));
 h.sender.syncInstrument(instrument);
 h.sender.syncDrumLane('kick',lane);
 for(const message of h.sent.splice(0)){
  const before=h.worklet;
  h.sent.push(message);h.deliver();
  assert.equal(h.worklet.revision,before.revision===0&&message.part==='reset'?message.revision:before.revision+1);
  assert.equal(mirrorDigest(h.worklet),h.sender.digestAt(message.revision),message.part);
 }
 assert.deepEqual(h.worklet.transport,transport.getState());
 assert.deepEqual(mirrorSummary(h.worklet),{transport:true,voices:3,drumLanes:1,instrument:true,drumBuses:0});
 assert.deepEqual(h.worklet.drumLanes.kick,lane);
});

test('only changed transport sections and changed settings are sent',()=>{
 const h=harness(),transport=createTransportState();
 h.sender.reset();h.sender.syncTransport(transport.getState());h.sender.syncVoice(0,voice(0));
 h.deliver();
 transport.pressNote(60);
 assert.equal(h.sender.syncTransport(transport.getState()),true);
 assert.deepEqual(Object.keys(h.sent.at(-1).value),['notes']);
 assert.equal(h.sender.syncTransport(transport.getState()),false);
 assert.equal(h.sender.syncVoice(0,voice(0)),false);
 assert.equal(h.sender.syncVoice(0,{...voice(0),decay:.5}),true);
 transport.set({drum:{grid:Array.from({length:4},()=>Array(16).fill(true))},masterBpm:128});
 h.sender.syncTransport(transport.getState());
 assert.deepEqual(Object.keys(h.sent.at(-1).value).sort(),['drum','masterBpm']);
 h.deliver();
 assert.deepEqual(h.worklet.transport,transport.getState());
 assert.equal(mirrorDigest(h.worklet),h.sender.digestAt(h.sender.revision));
});

test('a reset resends everything, and the worklet starts over',()=>{
 const h=harness();
 h.sender.reset();h.sender.syncVoice(1,voice(1));h.deliver();
 h.sender.reset();
 assert.equal(h.sender.syncVoice(1,voice(1)),true);
 h.deliver();
 assert.deepEqual(mirrorSummary(h.worklet),{transport:false,voices:1,drumLanes:0,instrument:false,drumBuses:0});
});

test('gaps and bad parts are rejected without changing the mirror',()=>{
 const mirror=applyMirrorMessage(emptyMirror(),{revision:1,part:'reset',value:null});
 assert.throws(()=>applyMirrorMessage(mirror,{revision:3,part:'instrument',value:instrument}),/revision 3 after 1/);
 assert.throws(()=>applyMirrorMessage(mirror,{revision:2,part:'voice',value:{chip:3,settings:{}}}),/voice chip/);
 assert.throws(()=>applyMirrorMessage(mirror,{revision:2,part:'drum-lane',value:{...lane,lane:'cowbell'}}),/drum lane cowbell/);
 assert.throws(()=>applyMirrorMessage(mirror,{revision:2,part:'transport',value:{tempo:1}}),/unknown transport section/);
 assert.throws(()=>applyMirrorMessage(mirror,{revision:2,part:'lfo',value:{}}),/unknown mirror part/);
 assert.equal(mirror.revision,1);
});

test('transportPatch is null when nothing changed',()=>{
 const state=createTransportState().getState();
 assert.equal(transportPatch(state,state),null);
 assert.deepEqual(Object.keys(transportPatch(null,state)),['masterBpm','arp','game','drum','scale','notes']);
});

test('status comparison and the Audio timing line',()=>{
 const h=harness();
 h.sender.reset();h.sender.syncVoice(0,voice(0));h.deliver();
 const status={revision:h.worklet.revision,digest:mirrorDigest(h.worklet),summary:mirrorSummary(h.worklet),error:null};
 assert.equal(formatSequencerMirror(null),'Worklet sequencer mirror: not reported yet');
 assert.equal(formatSequencerMirror(compareMirrorStatus(status,h.sender)),
  'Worklet sequencer mirror: revision 2, in sync · transport – · voices 1/3 · drum lanes 0/4 · drum buses 0/3 · allocation –');
 assert.match(formatSequencerMirror(compareMirrorStatus({...status,digest:'00000000'},h.sender)),/revision 2, MISMATCH/);
 h.sender.syncVoice(1,voice(1));
 assert.match(formatSequencerMirror(compareMirrorStatus(status,h.sender)),/revision 2 \(page at 3\), in sync/);
 assert.equal(formatSequencerMirror(compareMirrorStatus({...status,error:'boom'},h.sender)),'Worklet sequencer mirror: error (boom)');
 for(let i=0;i<70;i++)h.sender.syncInstrument({...instrument,detune:i});
 assert.match(formatSequencerMirror(compareMirrorStatus(status,h.sender)),/not comparable/);
});

test('the worklet processor applies mirror messages and throttles its status reports',async()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const {default:sequencer}=await import('../src/sequencer-worklet-modules.js');
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:48000,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 scope.project6581Sequencer=sequencer;
 vm.runInContext(source,scope);
 const processor=new Processor();
 const h=harness();
 h.sender.reset();h.sender.syncVoice(0,voice(0));h.sender.syncInstrument(instrument);
 for(const message of h.sent.splice(0))processor.port.onmessage({data:message});
 const statuses=()=>messages.filter(m=>m.type==='sequencer-mirror-status');
 assert.equal(statuses().length,1,'first report is immediate; the rest wait');
 scope.currentFrame=12000;
 processor.process([],[[new Float32Array(128)]]);
 assert.equal(statuses().length,2);
 const last=statuses().at(-1);
 assert.equal(last.revision,3);
 assert.equal(compareMirrorStatus(last,h.sender).state,'in-sync');
 processor.port.onmessage({data:{type:'sequencer-mirror',revision:9,part:'instrument',value:instrument}});
 scope.currentFrame=24000;
 processor.process([],[[new Float32Array(128)]]);
 assert.match(statuses().at(-1).error,/revision 9 after 3/);
 assert.equal(statuses().at(-1).revision,3);
});

test('without the sequencer modules the processor ignores mirror messages',()=>{
 const source=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 const messages=[];let Processor;
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)}},sampleRate:48000,currentFrame:0,
  registerProcessor(_name,type){Processor=type}});
 vm.runInContext(source,scope);
 new Processor().port.onmessage({data:{type:'sequencer-mirror',revision:1,part:'reset',value:null}});
 assert.equal(messages.length,0);
});

test('drum buses: SID 4–6 filter and enabled flag reach the worklet; bad values are rejected',()=>{
 const h=harness();
 h.sender.reset();
 const bus=chip=>({filter:{...engines[chip].filter},enabled:Boolean(engines[chip].voice.enabled)});
 for(let index=0;index<3;index++)h.sender.syncDrumBus(index,bus(3+index));
 assert.equal(h.sender.syncDrumBus(1,bus(4)),false,'unchanged bus is not resent');
 h.deliver();
 assert.deepEqual(h.worklet.drumBuses,[bus(3),bus(4),bus(5)]);
 assert.equal(mirrorDigest(h.worklet),h.sender.digestAt(h.sender.revision));
 assert.equal(mirrorSummary(h.worklet).drumBuses,3);
 h.sender.syncDrumBus(2,{...bus(5),enabled:false});
 h.deliver();
 assert.equal(h.worklet.drumBuses[2].enabled,false);
 const at=h.worklet.revision+1,filter=bus(3).filter;
 assert.throws(()=>applyMirrorMessage(h.worklet,{revision:at,part:'drum-bus',value:{bus:3,filter,enabled:true}}),RangeError);
 assert.throws(()=>applyMirrorMessage(h.worklet,{revision:at,part:'drum-bus',value:{bus:0,filter:{...filter,mode:'notch'},enabled:true}}),RangeError);
 assert.throws(()=>applyMirrorMessage(h.worklet,{revision:at,part:'drum-bus',value:{bus:0,filter:{...filter,volume:NaN},enabled:true}}),RangeError);
 assert.throws(()=>applyMirrorMessage(h.worklet,{revision:at,part:'drum-bus',value:{bus:0,filter,enabled:1}}),TypeError);
});
