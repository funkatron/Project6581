import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from './pitch-envelope.js';

export function defaultEngineSettings(model=6581){
 return {
  enabled:true,model,
  pan:0,
  voice:{wave:'square',attack:0.002,decay:0.12,sustain:0.8,release:0.12,pulse:50,pwmDepth:0,pwmRate:1,enabled:true,
   pitchEnvelope:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE)},
  filter:{cutoff:7000,resonance:10,volume:55,mode:'lowpass'}
 };
}

export function createDefaultEngines(chipModel=6581){
 return [0,1,2].map(()=>defaultEngineSettings(chipModel));
}

export function countEnabledEngines(engines){
 return engines.filter(engine=>engine.enabled).length;
}

/** Dynamic voice cap: 3 oscillators per enabled SID engine, max 9. */
export function maxVoicesForEngines(engines){
 const enabled=countEnabledEngines(engines);
 if(enabled<1)return 3;
 return Math.min(9,enabled*3);
}

export function requiredEnginePanels(voiceCount){
 return Math.min(3,Math.ceil(Math.max(1,voiceCount)/3));
}

export function clampVoiceCount(voiceCount,engines){
 const max=maxVoicesForEngines(engines);
 return Math.max(1,Math.min(max,Math.round(Number(voiceCount)||1)));
}

export const ROUTE_OPTIONS=['sid1','sid2','sid3','all','layer'];
export const DEFAULT_ROUTING={keyboard:'all',arp:'all',game:'sid1'};

export function routeMask(route,engines){
 const enabled=engines.map((engine,index)=>(engine.enabled?index:-1)).filter(index=>index>=0);
 if(route==='all'||route==='layer')return enabled;
 if(route==='sid1')return enabled.includes(0)?[0]:[];
 if(route==='sid2')return enabled.includes(1)?[1]:[];
 if(route==='sid3')return enabled.includes(2)?[2]:[];
 return enabled;
}