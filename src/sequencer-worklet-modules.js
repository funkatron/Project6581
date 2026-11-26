import {arpStep,gameStep,drumStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {
 createTransportState,applyTransportPatch,defaultTransport,
 activeNotes,arpNotes,resolveNote,drumSequence,arpStepMs,gameStepMs
} from './transport-state.js?v=__BUILD_ID__';
import {createNoteWriter} from './note-writes.js?v=__BUILD_ID__';
import {emptyMirror,applyMirrorMessage,mirrorDigest,mirrorSummary,createMirrorSender} from './sequencer-mirror.js?v=__BUILD_ID__';
import {createDrumShadow,drumStepSeconds} from './sequencer-shadow.js?v=__BUILD_ID__';
import {createDrumPlayer} from './drum-player.js?v=__BUILD_ID__';
import {createWorkletDrums} from './worklet-drums.js?v=__BUILD_ID__';

// Loaded into the AudioWorklet with its own addModule() call, separate from
// residfp-worklet.js, so a browser that rejects ES-module imports in worklets
// still starts the SID engine. All modules added to one AudioWorklet share a
// global scope: the SID processor finds these functions on globalThis and
// reports whether they loaded and passed the self-test (step 3, worklet
// sequencing). Also importable from Node and the page for tests.

/** Runs each pure step function once on known input. Returns {ok, error?}. */
export function sequencerSelfTest(){
 try{
  const transport=createTransportState();
  transport.set({notes:{held:[64,60,67]},arp:{pattern:'up'},scale:{tonic:0,id:'major',lock:true}});
  const state=transport.getState();
  const expect=(label,actual,expected)=>{
   if(JSON.stringify(actual)!==JSON.stringify(expected))
    throw new Error(label+': expected '+JSON.stringify(expected)+', got '+JSON.stringify(actual));
  };
  expect('arpNotes',arpNotes(state),[60,64,67]);
  expect('resolveNote',resolveNote(state,61)===61,false);
  const arp=arpStep({step:0,root:null,last:null},{notes:arpNotes(state),pattern:state.arp.pattern});
  expect('arpStep',arp.events,[{type:'on',note:60,source:'arp'}]);
  const game=gameStep({step:0,last:null},{root:60,sequence:state.game.sequence});
  expect('gameStep',game.clock.step,1);
  const drum=drumStep({step:0},{sequence:drumSequence(state)});
  expect('drumStep',drum.hits.map(hit=>hit.lane),['kick','ch']);
  expect('arpStepMs',arpStepMs(state),500);
  // Note → register writes: middle C on SID 1 voice 1, then release.
  const voice={wave:'square',attack:0.002,decay:0.12,sustain:0.8,release:0.12,pulse:50};
  const writer=createNoteWriter({settings:[voice]});
  const on=writer.noteOn(60);
  const writes=on.commands.filter(command=>command.type==='write');
  expect('noteOn frequency',writes.slice(0,2).map(w=>[w.register,w.value]),[[0,0x67],[1,0x11]]);
  expect('noteOn gate',writes.at(-1),{type:'write',register:4,value:0x41});
  // Mirror: what the page sends must rebuild the same state here.
  const sent=[];
  const sender=createMirrorSender(message=>sent.push(message));
  sender.reset();sender.syncTransport(state);sender.syncVoice(0,voice);
  const mirror=sent.reduce(applyMirrorMessage,emptyMirror());
  expect('mirror digest',mirrorDigest(mirror),sender.digestAt(sender.revision));
  expect('mirror summary',mirrorSummary(mirror),{transport:true,voices:1,drumLanes:0,instrument:false,drumBuses:0});
  // Drum shadow clock: 120 BPM, 1/16 → 0.125 s per step; two steps fall inside 0.25 s.
  expect('drumStepSeconds',drumStepSeconds(state),0.125);
  const shadow=createDrumShadow(48000);
  shadow.control({action:'run',run:1,step:0,firstAt:0},state,0);
  shadow.advance(12000,state);
  expect('shadow steps',shadow.takeReport().steps,[[1,0,0,0,'kick,ch'],[1,1,6000,1,'kick,ch']]);
  expect('noteOff gate',writer.noteOff(60,on.token),[{type:'pitch-envelope-stop',register:0},{type:'write',register:4,value:0x40}]);
  // Drum player: a kick retriggers SID 4 voice 1 (gate off, on), then off 40 ms (1,920 frames) later.
  const drums=createDrumPlayer({sampleRate:48000});
  const kick=drums.hit('kick',{note:36,level:100,voice:{wave:'triangle',attack:0,decay:0.01,sustain:0,release:0.01}},
   {busFilter:{cutoff:2583,resonance:100,volume:100,mode:'lowpass'},frame:0});
  expect('drum kick gate',kick.commands.filter(c=>c.register===0x64).map(c=>c.value),[0x10,0x11]);
  expect('drum kick release',[kick.releaseAt,drums.releaseDue(1919).length,drums.releaseDue(1920).at(-1)],
   [1920,0,{type:'write',register:0x64,value:0x10}]);
  // Worklet drums: with play:true, the shadow's first step (kick + closed hat) gates SID 4 and SID 6.
  const drumMirror={transport:state,
   drumLanes:{kick:{note:36,level:100,voice:{wave:'triangle',decay:0.01,release:0.01}},ch:{note:84,level:20,voice:{wave:'noise',decay:0.01,release:0.01}}},
   drumBuses:[0,1,2].map(()=>({filter:{cutoff:2583,resonance:50,volume:100,mode:'lowpass'},enabled:true}))};
  const worklet=createWorkletDrums({sampleRate:48000});
  worklet.control({action:'run',play:true});
  const gates=worklet.block([{frame:0,index:0}],drumMirror,128).filter(c=>c.register===0x64||c.register===0xa4).map(c=>c.register);
  expect('worklet drums step 0',gates,[0x64,0x64,0xa4,0xa4]);
  return {ok:true};
 }catch(error){
  return {ok:false,error:String(error?.message??error)};
 }
}

const api=Object.freeze({
 version:6,
 arpStep,gameStep,drumStep,
 createTransportState,applyTransportPatch,defaultTransport,
 activeNotes,arpNotes,resolveNote,drumSequence,arpStepMs,gameStepMs,
 createNoteWriter,
 emptyMirror,applyMirrorMessage,mirrorDigest,mirrorSummary,
 createDrumShadow,
 createDrumPlayer,createWorkletDrums,
 selfTest:sequencerSelfTest
});
globalThis.project6581Sequencer=api;
export default api;
