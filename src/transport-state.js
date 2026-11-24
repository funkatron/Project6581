import {stepMilliseconds} from './arp-composition.js?v=__BUILD_ID__';
import {defaultSequence,validateSequence} from './game-step-sequencer.js?v=__BUILD_ID__';

// What the Root Arp, Game Arp and drum clocks play from, held as plain data:
// tempo and step rates, Root Arp order and latch, the Game Arp phrase, and the
// physically held and latched notes. No DOM access: the playback path reads this,
// so the same state can later be posted to the AudioWorklet unchanged.
// transport-dom.js keeps tempo and rates in step with the controls.
// Clock runtime (timers, step counters, sounding notes) is not transport state.

export const TRANSPORT_RATES=Object.freeze([0.25,0.5,1,2,4,8,16,32]);
export const ARP_PATTERNS=Object.freeze(['up','down','updown','random']);
export const MIN_BPM=40,MAX_BPM=240;

export function defaultTransport(){
 return {
  masterBpm:120,
  arp:{pattern:'up',rate:1,sync:true,localBpm:120,latch:false},
  game:{rate:4,sequence:defaultSequence()},
  drum:{rate:4,sync:true,localBpm:120},
  // Insertion order: held notes replay in the order they were pressed.
  notes:{held:[],latched:[]}
 };
}

function bpmOr(value,fallback){
 const n=Math.round(Number(value));
 return Number.isFinite(n)&&n>=MIN_BPM&&n<=MAX_BPM?n:fallback;
}
function rateOr(value,fallback){
 const n=Number(value);
 return TRANSPORT_RATES.includes(n)?n:fallback;
}
function boolOr(value,fallback){
 return typeof value==='boolean'?value:fallback;
}

function noteListOr(value,fallback){
 if(!Array.isArray(value))return fallback;
 const out=[];
 for(const note of value)if(Number.isInteger(note)&&note>=0&&note<=127&&!out.includes(note))out.push(note);
 return out;
}

/**
 * Returns a new transport with `patch` applied. Invalid fields keep the previous value,
 * except `game.sequence`, which throws like validateSequence() (presets validate first).
 */
export function applyTransportPatch(state,patch={}){
 const arp=patch.arp??{},game=patch.game??{},drum=patch.drum??{},notes=patch.notes??{};
 return {
  masterBpm:bpmOr(patch.masterBpm,state.masterBpm),
  arp:{
   // An empty or unknown pattern plays as Up, as selectRoot() already does.
   pattern:arp.pattern===undefined?state.arp.pattern:ARP_PATTERNS.includes(arp.pattern)?arp.pattern:'up',
   rate:rateOr(arp.rate,state.arp.rate),
   sync:boolOr(arp.sync,state.arp.sync),
   localBpm:bpmOr(arp.localBpm,state.arp.localBpm),
   latch:boolOr(arp.latch,state.arp.latch)
  },
  game:{
   rate:rateOr(game.rate,state.game.rate),
   sequence:game.sequence===undefined?cloneSequence(state.game.sequence):validateSequence(game.sequence)
  },
  drum:{
   rate:rateOr(drum.rate,state.drum.rate),
   sync:boolOr(drum.sync,state.drum.sync),
   localBpm:bpmOr(drum.localBpm,state.drum.localBpm)
  },
  notes:{
   held:noteListOr(notes.held,[...state.notes.held]),
   latched:noteListOr(notes.latched,[...state.notes.latched])
  }
 };
}

/** Notes the arps play from: the latched set while Latch holds any, else held keys. */
export function activeNotes(state){
 return [...(state.arp.latch&&state.notes.latched.length?state.notes.latched:state.notes.held)];
}

/** Tempo shared by the Root Arp and Game Arp clocks (Sync follows master BPM). */
export function arpTempo(state){
 return state.arp.sync?state.masterBpm:state.arp.localBpm;
}
export function arpStepMs(state){
 return stepMilliseconds(arpTempo(state),state.arp.rate);
}
export function gameStepMs(state){
 return stepMilliseconds(arpTempo(state),state.game.rate);
}
/** Drum sequence with the live transport fields (rate, sync, local BPM) applied. */
export function withDrumTransport(sequence,state){
 return {...sequence,rate:state.drum.rate,sync:state.drum.sync,localBpm:state.drum.localBpm};
}

function cloneSequence(sequence){
 return {length:sequence.length,steps:sequence.steps.map(step=>({...step}))};
}
function cloneTransport(state){
 return {
  masterBpm:state.masterBpm,arp:{...state.arp},
  game:{rate:state.game.rate,sequence:cloneSequence(state.game.sequence)},
  drum:{...state.drum},
  notes:{held:[...state.notes.held],latched:[...state.notes.latched]}
 };
}

export function createTransportState(initial=defaultTransport()){
 let state=applyTransportPatch(defaultTransport(),initial);
 const listeners=new Set();
 function set(patch){
  const next=applyTransportPatch(state,patch);
  if(JSON.stringify(next)===JSON.stringify(state))return false;
  state=next;
  const snapshot=cloneTransport(state);
  for(const fn of listeners)fn(snapshot);
  return true;
 }
 const setNotes=notes=>set({notes});
 return {
  get masterBpm(){return state.masterBpm},
  get arp(){return {...state.arp}},
  get game(){return {rate:state.game.rate,sequence:cloneSequence(state.game.sequence)}},
  get drum(){return {...state.drum}},
  get sequence(){return cloneSequence(state.game.sequence)},
  get held(){return [...state.notes.held]},
  get latched(){return [...state.notes.latched]},
  getState:()=>cloneTransport(state),
  set,
  activeNotes:()=>activeNotes(state),
  isHeld:note=>state.notes.held.includes(note),

  // Game Arp phrase. Edits validate the whole phrase and throw on invalid input.
  setSequence:sequence=>set({game:{sequence}}),
  setSequenceLength:length=>set({game:{sequence:{...cloneSequence(state.game.sequence),length}}}),
  updateStep(index,patch){
   const sequence=cloneSequence(state.game.sequence);
   if(!sequence.steps[index])throw new RangeError('Invalid step '+index);
   Object.assign(sequence.steps[index],patch);
   return set({game:{sequence}});
  },

  /**
   * A physical key goes down. With `capture` (an arp running and Latch on), the
   * first key of a new chord replaces the latched set and later keys add to it.
   * Returns false if the key was already held.
   */
  pressNote(note,{capture=false}={}){
   if(state.notes.held.includes(note))return false;
   const firstPhysical=state.notes.held.length===0;
   const nextLatched=capture?[...(firstPhysical?[]:state.notes.latched),note]:state.notes.latched;
   setNotes({held:[...state.notes.held,note],latched:nextLatched});
   return true;
  },
  releaseNote(note){
   if(!state.notes.held.includes(note))return false;
   setNotes({held:state.notes.held.filter(held=>held!==note)});
   return true;
  },
  clearHeld:()=>setNotes({held:[]}),
  clearLatched:()=>setNotes({latched:[]}),
  clearNotes:()=>setNotes({held:[],latched:[]}),
  /** Turning Latch on keeps the keys already down. */
  latchHeld:()=>setNotes({latched:[...state.notes.latched,...state.notes.held]}),

  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}
 };
}
