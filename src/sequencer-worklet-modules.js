import {arpStep,gameStep,drumStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {
 createTransportState,applyTransportPatch,defaultTransport,
 activeNotes,arpNotes,resolveNote,drumSequence,arpStepMs,gameStepMs
} from './transport-state.js?v=__BUILD_ID__';

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
  return {ok:true};
 }catch(error){
  return {ok:false,error:String(error?.message??error)};
 }
}

const api=Object.freeze({
 version:1,
 arpStep,gameStep,drumStep,
 createTransportState,applyTransportPatch,defaultTransport,
 activeNotes,arpNotes,resolveNote,drumSequence,arpStepMs,gameStepMs,
 selfTest:sequencerSelfTest
});
globalThis.project6581Sequencer=api;
export default api;
