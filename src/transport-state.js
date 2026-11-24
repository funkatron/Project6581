import {stepMilliseconds} from './arp-composition.js?v=__BUILD_ID__';

// Tempo and step rates for the Root Arp, Game Arp and drum clocks, held as plain data.
// No DOM access: the playback path reads this, so the same state can later be posted
// to the AudioWorklet unchanged. transport-dom.js keeps it in step with the controls.

export const TRANSPORT_RATES=Object.freeze([0.25,0.5,1,2,4,8,16,32]);
export const ARP_PATTERNS=Object.freeze(['up','down','updown','random']);
export const MIN_BPM=40,MAX_BPM=240;

export function defaultTransport(){
 return {
  masterBpm:120,
  arp:{pattern:'up',rate:1,sync:true,localBpm:120},
  game:{rate:4},
  drum:{rate:4,sync:true,localBpm:120}
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

/** Returns a new transport with `patch` applied. Invalid fields keep the previous value. */
export function applyTransportPatch(state,patch={}){
 const arp=patch.arp??{},game=patch.game??{},drum=patch.drum??{};
 return {
  masterBpm:bpmOr(patch.masterBpm,state.masterBpm),
  arp:{
   // An empty or unknown pattern plays as Up, as selectRoot() already does.
   pattern:arp.pattern===undefined?state.arp.pattern:ARP_PATTERNS.includes(arp.pattern)?arp.pattern:'up',
   rate:rateOr(arp.rate,state.arp.rate),
   sync:boolOr(arp.sync,state.arp.sync),
   localBpm:bpmOr(arp.localBpm,state.arp.localBpm)
  },
  game:{rate:rateOr(game.rate,state.game.rate)},
  drum:{
   rate:rateOr(drum.rate,state.drum.rate),
   sync:boolOr(drum.sync,state.drum.sync),
   localBpm:bpmOr(drum.localBpm,state.drum.localBpm)
  }
 };
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

function cloneTransport(state){
 return {masterBpm:state.masterBpm,arp:{...state.arp},game:{...state.game},drum:{...state.drum}};
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
 return {
  get masterBpm(){return state.masterBpm},
  get arp(){return {...state.arp}},
  get game(){return {...state.game}},
  get drum(){return {...state.drum}},
  getState:()=>cloneTransport(state),
  set,
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}
 };
}
