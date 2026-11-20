import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from './pitch-envelope.js';

export const SID_CHIP_COUNT=4;
export const DRUM_ENGINE_INDEX=3;
export const MAX_SID_OSCILLATORS=9;
export const SID_ENGINE_COUNT=SID_CHIP_COUNT;

/** Physical voice slot indices (9–11) on SID 4 — independent of keyboard voice budget. */
export function drumVoiceSlots(){
 const base=DRUM_ENGINE_INDEX*3;
 return [base,base+1,base+2];
}

export function defaultEngineSettings(model=6581){
 return {
  model,
  pan:0,
  outputBoostDb:0,
  voice:{wave:'square',attack:0.002,decay:0.12,sustain:0.8,release:0.12,pulse:50,pwmDepth:0,pwmRate:1,enabled:true,
   pitchEnvelope:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE)},
  filter:{cutoff:7000,resonance:10,volume:55,mode:'lowpass'}
 };
}

export function defaultDrumEngineSettings(model=6581){
 return {
  ...defaultEngineSettings(model),
  outputBoostDb:18,
  // Shared drum bus: one low-pass for kick + sn + hat (see agents/drum-shared-filter-kit.md).
  filter:{cutoff:1800,resonance:14,volume:82,mode:'lowpass'}
 };
}

export function createDefaultEngines(chipModel=6581){
 return [
  defaultEngineSettings(chipModel),
  defaultEngineSettings(chipModel),
  defaultEngineSettings(chipModel),
  defaultDrumEngineSettings(chipModel)
 ];
}

/** Melodic oscillator budget across SID 1–3 (nine voices). SID 4 is drum-only. */
export function maxVoicesForEngines(){
 return MAX_SID_OSCILLATORS;
}

export function clampVoiceCount(voiceCount){
 return Math.max(1,Math.min(MAX_SID_OSCILLATORS,Math.round(Number(voiceCount)||1)));
}

export const ROUTE_OPTIONS=['sid1','sid2','sid3','all','layer'];
export const DEFAULT_ROUTING={keyboard:'sid1',arp:'sid1',game:'sid1'};

export function routeMask(route){
 if(route==='all'||route==='layer')return [0,1,2];
 if(route==='sid1')return [0];
 if(route==='sid2')return [1];
 if(route==='sid3')return [2];
 return [0,1,2];
}

export function routingKeyForSource(source){
 if(source==='game')return 'game';
 if(source==='arp')return 'arp';
 if(typeof source==='string'&&source.startsWith('key:'))return 'keyboard';
 return 'keyboard';
}

export function readRoutingFromDom($,routing=DEFAULT_ROUTING){
 const pick=(value,fallback)=>ROUTE_OPTIONS.includes(value)?value:fallback;
 return {
  keyboard:pick($('keyboardRoute')?.value,routing.keyboard),
  arp:pick($('arpRoute')?.value,routing.arp),
  game:pick($('gameRoute')?.value,routing.game)
 };
}