import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from './pitch-envelope.js';
import {defaultDrumBusEngines} from './drum-bus-engines.js';

export const SID_CHIP_COUNT=6;
export const MELODIC_CHIP_COUNT=3;
/** First drum chip: SID 4 kick. SID 5 snare and SID 6 cymbals follow. */
export const DRUM_ENGINE_INDEX=3;
export const DRUM_CHIP_COUNT=3;
export const MAX_SID_OSCILLATORS=9;
export const SID_ENGINE_COUNT=SID_CHIP_COUNT;

export function isDrumChip(index){
 return Number.isInteger(index)&&index>=DRUM_ENGINE_INDEX&&index<SID_CHIP_COUNT;
}

/** Bus 0 kick → chip 3, bus 1 snare → chip 4, bus 2 cymbals → chip 5. */
export function drumChipForBus(busIndex){
 if(!Number.isInteger(busIndex)||busIndex<0||busIndex>=DRUM_CHIP_COUNT){
  throw new RangeError('Drum bus');
 }
 return DRUM_ENGINE_INDEX+busIndex;
}

/** Voice 0 on each dedicated drum chip (slots 9, 12, and 15). */
export function drumVoiceSlots(){
 return [0,1,2].map(bus=>drumChipForBus(bus)*3);
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
  outputBoostDb:24,
  // Legacy single-filter field; playback uses sound.drumBuses[0–2]. Kept for LFO UI fallback.
  filter:{cutoff:2138,resonance:11,volume:90,mode:'lowpass'}
 };
}

export function createDefaultEngines(chipModel=6581){
 const melodic=[
  defaultEngineSettings(chipModel),
  defaultEngineSettings(chipModel),
  defaultEngineSettings(chipModel)
 ];
 const drums=defaultDrumBusEngines().map(bus=>({
  ...defaultDrumEngineSettings(chipModel),
  filter:{...bus.filter}
 }));
 return [...melodic,...drums];
}

/** Melodic oscillator budget across SID 1–3 (nine voices). SID 4–6 are drums. */
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