import {applyTransportPatch,defaultTransport} from './transport-state.js?v=0.30.0+20261128T010628315Z';

// Step 3a (worklet sequencing): the main thread keeps a copy of what the
// worklet will need to sequence on its own clock, without changing playback.
//
// Both sides run applyMirrorMessage, so the digest the worklet reports for a
// revision must equal the digest the page computed for that same revision.
// The mirror holds base settings, not LFO-modulated live values: modulation
// stays on the audio clock in the worklet.
//
// Messages are {type:'sequencer-mirror', revision, part, value}:
//   reset       value null; starts a new run at this revision
//   transport   value is a transport patch (changed sections only)
//   voice       {chip 0–2, settings}: engine voice for a melodic SID
//   drum-lane   {lane, note, level, voice, filter}: what one drum hit plays
//   instrument  {voiceCount, unisonCount, mode, detune}: voice allocation
//   drum-bus    {bus 0–2, filter, enabled}: SID 4–6 bus filter and whether the chip plays

export const MIRROR_MESSAGE='sequencer-mirror';
export const MIRROR_STATUS='sequencer-mirror-status';
export const MIRROR_MELODIC_CHIPS=3;
export const MIRROR_DRUM_LANES=Object.freeze(['kick','sn','ch','oh']);
export const MIRROR_DRUM_BUSES=3;
const FILTER_MODES=Object.freeze(['lowpass','bandpass','highpass']);
const TRANSPORT_SECTIONS=Object.freeze(['masterBpm','arp','game','drum','scale','notes']);
const DIGEST_HISTORY=64;

export function emptyMirror(revision=0){
 return {
  revision,
  transport:null,
  voices:Array.from({length:MIRROR_MELODIC_CHIPS},()=>null),
  drumLanes:Object.fromEntries(MIRROR_DRUM_LANES.map(lane=>[lane,null])),
  instrument:null,
  drumBuses:Array.from({length:MIRROR_DRUM_BUSES},()=>null)
 };
}

const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function requireObject(value,label){
 if(!isObject(value))throw new TypeError(label+' must be an object');
 return value;
}

/** Applies one message. Revisions must be consecutive, except that a reset may start anywhere. */
export function applyMirrorMessage(mirror,message){
 requireObject(message,'mirror message');
 const {revision,part,value}=message;
 if(!Number.isInteger(revision)||revision<1)throw new RangeError('mirror revision must be a positive integer');
 if(part==='reset')return emptyMirror(revision);
 if(revision!==mirror.revision+1)throw new RangeError('mirror revision '+revision+' after '+mirror.revision);
 const next={...mirror,revision};
 if(part==='transport'){
  const patch=requireObject(value,'transport patch');
  for(const key of Object.keys(patch))
   if(!TRANSPORT_SECTIONS.includes(key))throw new RangeError('unknown transport section '+key);
  next.transport=applyTransportPatch(mirror.transport??defaultTransport(),patch);
 }else if(part==='voice'){
  requireObject(value,'voice');
  if(!Number.isInteger(value.chip)||value.chip<0||value.chip>=MIRROR_MELODIC_CHIPS)throw new RangeError('voice chip');
  next.voices=mirror.voices.map((voice,chip)=>chip===value.chip?requireObject(value.settings,'voice settings'):voice);
 }else if(part==='drum-lane'){
  requireObject(value,'drum lane');
  if(!MIRROR_DRUM_LANES.includes(value.lane))throw new RangeError('drum lane '+value.lane);
  if(!Number.isInteger(value.note)||value.note<0||value.note>127)throw new RangeError('drum lane note');
  requireObject(value.voice,'drum lane voice');
  const {lane,...hit}=value;
  next.drumLanes={...mirror.drumLanes,[lane]:hit};
 }else if(part==='instrument'){
  next.instrument=requireObject(value,'instrument');
 }else if(part==='drum-bus'){
  requireObject(value,'drum bus');
  if(!Number.isInteger(value.bus)||value.bus<0||value.bus>=MIRROR_DRUM_BUSES)throw new RangeError('drum bus');
  const filter=requireObject(value.filter,'drum bus filter');
  for(const key of ['cutoff','resonance','volume'])
   if(!Number.isFinite(filter[key]))throw new RangeError('drum bus filter '+key);
  if(!FILTER_MODES.includes(filter.mode))throw new RangeError('drum bus filter mode');
  if(typeof value.enabled!=='boolean')throw new TypeError('drum bus enabled must be a boolean');
  const {bus,...rest}=value;
  next.drumBuses=(mirror.drumBuses??emptyMirror().drumBuses).map((entry,index)=>index===bus?rest:entry);
 }else{
  throw new RangeError('unknown mirror part '+part);
 }
 return next;
}

/** FNV-1a over the mirrored data (revision excluded), as 8 hex digits. */
export function mirrorDigest(mirror){
 const text=JSON.stringify([mirror.transport,mirror.voices,mirror.drumLanes,mirror.instrument,mirror.drumBuses]);
 let hash=0x811c9dc5;
 for(let i=0;i<text.length;i++){
  hash^=text.charCodeAt(i);
  hash=Math.imul(hash,0x01000193)>>>0;
 }
 return hash.toString(16).padStart(8,'0');
}

export function mirrorSummary(mirror){
 return {
  transport:mirror.transport!==null,
  voices:mirror.voices.filter(Boolean).length,
  drumLanes:MIRROR_DRUM_LANES.filter(lane=>mirror.drumLanes[lane]).length,
  instrument:mirror.instrument!==null,
  drumBuses:(mirror.drumBuses??[]).filter(Boolean).length
 };
}

/** Changed transport sections between two transport states (null = nothing changed). */
export function transportPatch(previous,next){
 const patch={};
 for(const key of TRANSPORT_SECTIONS){
  if(!previous||JSON.stringify(previous[key])!==JSON.stringify(next[key]))patch[key]=structuredCloneJson(next[key]);
 }
 return Object.keys(patch).length?patch:null;
}
const structuredCloneJson=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));

/**
 * Main-thread side. Sends only what changed and keeps the same mirror the
 * worklet should hold, with recent digests for comparing worklet reports.
 */
export function createMirrorSender(post){
 let mirror=emptyMirror();
 const lastSent=new Map(),digests=new Map();
 function emit(part,value){
  const message={type:MIRROR_MESSAGE,revision:mirror.revision+1,part,value};
  mirror=applyMirrorMessage(mirror,message);
  digests.set(mirror.revision,mirrorDigest(mirror));
  if(digests.size>DIGEST_HISTORY)digests.delete(digests.keys().next().value);
  post(message);
  return true;
 }
 function sendIfChanged(key,part,value){
  const json=JSON.stringify(value);
  if(lastSent.get(key)===json)return false;
  lastSent.set(key,json);
  return emit(part,JSON.parse(json));
 }
 return {
  /** Starts a new run (new audio node); everything is sent again afterwards. */
  reset(){lastSent.clear();return emit('reset',null)},
  syncTransport(state){
   const patch=transportPatch(mirror.transport,state);
   return patch?emit('transport',patch):false;
  },
  syncVoice:(chip,settings)=>sendIfChanged('voice:'+chip,'voice',{chip,settings}),
  syncDrumLane:(lane,hit)=>sendIfChanged('drum-lane:'+lane,'drum-lane',{lane,...hit}),
  syncInstrument:instrument=>sendIfChanged('instrument','instrument',instrument),
  syncDrumBus:(bus,value)=>sendIfChanged('drum-bus:'+bus,'drum-bus',{bus,...value}),
  get revision(){return mirror.revision},
  get mirror(){return mirror},
  /** Page digest at a recent revision, or null if that revision is too old. */
  digestAt:revision=>digests.get(revision)??null
 };
}

/** Compares a worklet status report with the page's own digest at that revision. */
export function compareMirrorStatus(status,sender){
 if(!status)return null;
 if(status.error)return {...status,state:'error'};
 const expected=sender.digestAt(status.revision);
 const state=expected===null?'unknown':expected===status.digest?'in-sync':'mismatch';
 return {...status,state,pageRevision:sender.revision};
}

/** One diagnostics line for the Audio timing panel. */
export function formatSequencerMirror(compared){
 if(!compared)return 'Worklet sequencer mirror: not reported yet';
 if(compared.state==='error')return 'Worklet sequencer mirror: error ('+compared.error+')';
 const s=compared.summary??{};
 const parts='transport '+(s.transport?'✓':'–')+' · voices '+(s.voices??0)+'/'+MIRROR_MELODIC_CHIPS
  +' · drum lanes '+(s.drumLanes??0)+'/'+MIRROR_DRUM_LANES.length+' · drum buses '+(s.drumBuses??0)+'/'+MIRROR_DRUM_BUSES
  +' · allocation '+(s.instrument?'✓':'–');
 const behind=compared.pageRevision>compared.revision?' (page at '+compared.pageRevision+')':'';
 const state={'in-sync':'in sync','mismatch':'MISMATCH','unknown':'not comparable'}[compared.state];
 return 'Worklet sequencer mirror: revision '+compared.revision+behind+', '+state+' · '+parts;
}
