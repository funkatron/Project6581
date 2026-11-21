import {defaultSequence,validateSequence} from './game-step-sequencer.js';
import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from './pitch-envelope.js';
import {pitchEnvelopeTemplates} from './pitch-envelope-editor.js';
const FACTORY_PITCH=pitchEnvelopeTemplates();
import {createDefaultEngines,DEFAULT_ROUTING,ROUTE_OPTIONS,defaultDrumEngineSettings,defaultEngineSettings} from './sid-engines.js';
import {defaultDrumKit,defaultDrumSequence,validateDrumEngineBoost,validateDrumKit,validateDrumSequence} from './drum-step-sequencer.js';
import {validateScaleSettings} from './western-scales.js';
import {LFO_TARGET_ORDER,LFO_WAVES} from './lfo-modulation.js';
import {validateVoiceWave} from './sid-waveform.js';
// Project6581 preset format v5: per-engine sound blocks and performance.routing (v4 imports upgrade).
export const PRESET_VERSION=5;
export const PRESET_STORAGE_KEY='project6581.user-presets.v5';
export const LEGACY_PRESET_STORAGE_KEY_V4='project6581.user-presets.v4';
export const LEGACY_PRESET_STORAGE_KEY_V3='project6581.user-presets.v3';
export const IMPORTABLE_PRESET_VERSIONS=Object.freeze([3,4,5]);
export const MAX_USER_PRESETS=100;
const WAVES=['triangle','sawtooth','square','noise'];
const MODES=['lowpass','bandpass','highpass'];
const ASSIGNMENTS=['mono','legato','duo','poly'];
const TARGETS=LFO_TARGET_ORDER;
const DIVISIONS=[.25,.5,1,2,4,8,16,32];
const PATTERNS=['up','down','updown','random'];
const STYLES=['action','adventure','arcade','custom'];
function object(v,name){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new TypeError(name+' must be an object');
 return v;
}
function numeric(v,name,min,max){
 if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' must be between '+min+' and '+max);
 return v;
}
function integer(v,name,min,max){
 if(!Number.isInteger(numeric(v,name,min,max)))throw new RangeError(name+' must be an integer');
 return v;
}
function boolean(v,name){
 if(typeof v!=='boolean')throw new TypeError(name+' must be true or false');
 return v;
}
function choice(v,name,options){
 if(!options.includes(v))throw new RangeError('Invalid '+name);
 return v;
}
function divisionChoice(v,name,options=DIVISIONS,fallback){
 if(v===undefined||v===null)v=fallback;
 const n=typeof v==='number'?v:Number(v);
 if(!Number.isFinite(n))throw new RangeError('Invalid '+name);
 const match=options.find(d=>Object.is(d,n)||Math.abs(d-n)<1e-9);
 if(match===undefined)throw new RangeError('Invalid '+name);
 return match;
}
function defaultEngineBank(){
 return createDefaultEngines(6581);
}
const DRUM_LFO_TARGETS=LFO_TARGET_ORDER.filter(t=>t!=='detune'&&t!=='pwmDepth'&&t!=='pwmRate');
export function validateDrumLfo(lfo){
 if(lfo===undefined||lfo===null){
  return {enabled:false,sync:false,wave:'sine',rate:1,syncDivision:4,depth:0,target:'cutoff',phase:0,seed:0,engines:'4'};
 }
 const row=object(lfo,'drumLfo');
 return {
  enabled:boolean(row.enabled,'drum LFO enabled'),sync:boolean(row.sync,'drum LFO sync'),
  wave:choice(row.wave,'drum LFO waveform',LFO_WAVES),
  rate:numeric(row.rate,'drum LFO rate',.05,20),
  syncDivision:divisionChoice(row.syncDivision,'drum LFO division',DIVISIONS,4),
  depth:numeric(row.depth,'drum LFO depth',0,1),
  target:choice(row.target,'drum LFO target',DRUM_LFO_TARGETS),
  phase:numeric(row.phase,'drum LFO phase',-1e6,1e6),seed:numeric(row.seed,'drum LFO seed',-1e6,1e6),
  engines:'4'
 };
}
export function defaultPresetSettings(){
 return validatePresetSettings({
  sound:{
   engines:defaultEngineBank(),
   instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:12},
   lfos:Array.from({length:3},(_,i)=>({enabled:false,sync:false,wave:'sine',rate:1,syncDivision:4,depth:0,target:'cutoff',phase:0,seed:i,engines:'all'})),
   drumLfo:validateDrumLfo(null)
  },
  performance:{
   masterBpm:120,
   routing:{...DEFAULT_ROUTING},
   arp:{enabled:false,latch:false,pattern:'up',rate:4,sync:true,localBpm:120},
   game:{enabled:false,style:'action',rate:4,sequence:defaultSequence()},
   drumSequence:defaultDrumSequence(),
   drumKit:defaultDrumKit(),
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 });
}
export function validateDrumEngineSlice(engine){
 return validateEngine({...defaultDrumEngineSettings(),...object(engine??{},'drumEngine')},3);
}
function validateEngine(engine,index){
 const e=object(engine,'SID '+(index+1));
 const voice=attachDefaultPitchEnvelope(e.voice??{});
 const filter=object(e.filter??defaultEngineSettings().filter,'filter');
 const boost=index===3?validateDrumEngineBoost(e.outputBoostDb):0;
 return {
  model:choice(e.model,'chip model',[6581,8580]),
  pan:numeric(e.pan??0,'pan',-100,100),
  outputBoostDb:boost,
  voice:{
   enabled:boolean(voice.enabled,'enabled'),wave:validateVoiceWave(voice.wave),
   attack:numeric(voice.attack,'attack',0,2),decay:numeric(voice.decay,'decay',0,3),
   sustain:numeric(voice.sustain,'sustain',0,1),release:numeric(voice.release,'release',.01,4),
   pulse:numeric(voice.pulse,'pulse width',5,95),pwmDepth:numeric(voice.pwmDepth,'PWM depth',0,45),
   pwmRate:numeric(voice.pwmRate,'PWM rate',.1,12),
   pitchEnvelope:validatePitchEnvelope(voice.pitchEnvelope)
  },
  filter:{
   cutoff:numeric(filter.cutoff,'cutoff',50,10000),
   resonance:numeric(filter.resonance,'resonance',0,100),
   volume:numeric(filter.volume,'volume',0,100),mode:choice(filter.mode,'filter mode',MODES)
  }
 };
}
function migrateLegacySound(sound){
 if(Array.isArray(sound.engines)&&sound.engines.length===4){
  return sound.engines.map((engine,i)=>validateEngine(engine,i));
 }
 if(Array.isArray(sound.engines)&&sound.engines.length===3){
  const engines=sound.engines.map((engine,i)=>validateEngine(engine,i));
  engines.push(validateEngine(defaultDrumEngineSettings(),3));
  return engines;
 }
 const model=choice(sound.model??6581,'chip model',[6581,8580]);
 const engines=defaultEngineBank();
 engines[0].model=model;
 const v=attachDefaultPitchEnvelope(sound.voice);
 const filter=object(sound.filter??engines[0].filter,'filter');
 Object.assign(engines[0].voice,{
  enabled:boolean(v.enabled,'enabled'),wave:validateVoiceWave(v.wave),
  attack:numeric(v.attack,'attack',0,2),decay:numeric(v.decay,'decay',0,3),
  sustain:numeric(v.sustain,'sustain',0,1),release:numeric(v.release,'release',.01,4),
  pulse:numeric(v.pulse,'pulse width',5,95),pwmDepth:numeric(v.pwmDepth,'PWM depth',0,45),
  pwmRate:numeric(v.pwmRate,'PWM rate',.1,12),
  pitchEnvelope:validatePitchEnvelope(v.pitchEnvelope)
 });
 Object.assign(engines[0].filter,{
  cutoff:numeric(filter.cutoff,'cutoff',50,10000),
  resonance:numeric(filter.resonance,'resonance',0,100),
  volume:numeric(filter.volume,'volume',0,100),mode:choice(filter.mode,'filter mode',MODES)
 });
 return engines.map((engine,i)=>validateEngine(engine,i));
}
export function attachDefaultPitchEnvelope(voice){
 const source=object(voice,'voice');
 if(source.pitchEnvelope===undefined)return {...source,pitchEnvelope:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE)};
 return source;
}
export function validatePresetSettings(value){
 const root=object(value,'settings'),sound=object(root.sound,'sound');
 const ins=object(sound.instrument,'instrument');
 if(!Array.isArray(sound.lfos)||sound.lfos.length!==3)throw new RangeError('Exactly three LFOs are required');
 const engines=migrateLegacySound(sound);
 const perf=object(root.performance,'performance');
 const arp=object(perf.arp,'arpeggiator'),game=object(perf.game,'Game Arp');
 const routing=object(perf.routing??DEFAULT_ROUTING,'routing');
 return {
  sound:{
   engines,
   instrument:{
    voiceCount:integer(ins.voiceCount,'voice count',1,9),
    unisonCount:integer(ins.unisonCount,'unison layers',1,integer(ins.voiceCount,'voice count',1,9)),
    mode:choice(ins.mode,'voice assignment',ASSIGNMENTS),
    detune:numeric(ins.detune,'detune',0,100)
   },
   lfos:sound.lfos.map((lfo,i)=>{
    object(lfo,'LFO '+(i+1));
    return {
     enabled:boolean(lfo.enabled,'LFO enabled'),sync:boolean(lfo.sync,'LFO sync'),
     wave:choice(lfo.wave,'LFO waveform',LFO_WAVES),
     rate:numeric(lfo.rate,'LFO rate',.05,20),syncDivision:divisionChoice(lfo.syncDivision,'LFO division',DIVISIONS,4),
     depth:numeric(lfo.depth,'LFO depth',0,1),target:choice(lfo.target,'LFO target',TARGETS),
     phase:numeric(lfo.phase,'LFO phase',-1e6,1e6),seed:numeric(lfo.seed,'LFO seed',-1e6,1e6),
     engines:choice(lfo.engines??'all','LFO engines',['all','1','2','3'])
    };
   }),
   drumLfo:validateDrumLfo(sound.drumLfo)
  },
  performance:{
   masterBpm:integer(perf.masterBpm,'master BPM',40,240),
   routing:{
    keyboard:choice(routing.keyboard??DEFAULT_ROUTING.keyboard,'keyboard route',ROUTE_OPTIONS),
    arp:choice(routing.arp??DEFAULT_ROUTING.arp,'Root Arp route',ROUTE_OPTIONS),
    game:choice(routing.game??DEFAULT_ROUTING.game,'Game Arp route',ROUTE_OPTIONS)
   },
   arp:{
    enabled:boolean(arp.enabled,'Arp enabled'),latch:boolean(arp.latch,'Arp latch'),
    pattern:choice(arp.pattern,'Arp pattern',PATTERNS),
    rate:divisionChoice(arp.rate,'Arp rate',DIVISIONS,4),
    sync:boolean(arp.sync,'Arp sync'),localBpm:integer(arp.localBpm,'local BPM',40,240)
   },
   game:{enabled:boolean(game.enabled,'Game Arp enabled'),style:choice(game.style,'Game Arp style',STYLES),
    rate:divisionChoice(game.rate,'Game Arp pattern rate',DIVISIONS,4),
    sequence:validateSequence(game.sequence??defaultSequence())},
   drumSequence:validateDrumSequence(perf.drumSequence??defaultDrumSequence()),
   drumKit:validateDrumKit(perf.drumKit??defaultDrumKit()),
   scale:validateScaleSettings(perf.scale)
  }
 };
}
export function cleanPresetName(name){
 if(typeof name!=='string')throw new TypeError('Preset name must be text');
 const trimmed=name.trim();
 if(!trimmed||trimmed.length>64||/[\u0000-\u001f\u007f]/.test(trimmed))
  throw new RangeError('Preset name must be 1–64 characters without control characters');
 return trimmed;
}
/** True when loading `next` over `previous` must silence active voices (routing, allocation, or chip model). */
export function presetLoadRequiresSilence(previous,next){
 const a=validatePresetSettings(previous);
 const b=validatePresetSettings(next);
 const pr=a.performance.routing, nr=b.performance.routing;
 if(pr.keyboard!==nr.keyboard||pr.arp!==nr.arp||pr.game!==nr.game)return true;
 const pi=a.sound.instrument, ni=b.sound.instrument;
 if(pi.voiceCount!==ni.voiceCount||pi.unisonCount!==ni.unisonCount||pi.mode!==ni.mode)return true;
 for(let i=0;i<3;i++){
  const pe=a.sound.engines[i], ne=b.sound.engines[i];
  if(pe.model!==ne.model)return true;
  if(Boolean(pe.voice?.enabled)!==Boolean(ne.voice?.enabled))return true;
 }
 return false;
}
export function validatePreset(value,{requireId=false}={}){
 const p=object(value,'preset');
 const out={name:cleanPresetName(p.name),settings:validatePresetSettings(p.settings)};
 if(requireId){
  if(typeof p.id!=='string'||!p.id||p.id.length>128)throw new TypeError('Invalid preset ID');
  out.id=p.id;
 }
 return out;
}
function applyEnginePatch(engine,patch={}){
 if(patch.voice)Object.assign(engine.voice,patch.voice);
 if(patch.filter)Object.assign(engine.filter,patch.filter);
 if(patch.model)engine.model=patch.model;
 if(patch.pan!==undefined)engine.pan=patch.pan;
}
function factory(id,name,category,patch={}){
 const settings=defaultPresetSettings();
 if(patch.voice)Object.assign(settings.sound.engines[0].voice,patch.voice);
 if(patch.instrument){
  Object.assign(settings.sound.instrument,patch.instrument);
  // Existing factory sound design stacked all its selected oscillators.
  if(patch.instrument.voiceCount&&!('unisonCount' in patch.instrument))
   settings.sound.instrument.unisonCount=settings.sound.instrument.voiceCount;
 }
 if(patch.filter)Object.assign(settings.sound.engines[0].filter,patch.filter);
 if(patch.model)settings.sound.engines[0].model=patch.model;
 if(Array.isArray(patch.engines)){
  patch.engines.forEach((enginePatch,index)=>{
   if(!enginePatch||index>2)return;
   applyEnginePatch(settings.sound.engines[index],enginePatch);
  });
 }
 if(patch.lfos)patch.lfos.forEach((lfo,i)=>Object.assign(settings.sound.lfos[i],lfo));
 if(patch.drumLfo)Object.assign(settings.sound.drumLfo,validateDrumLfo({...settings.sound.drumLfo,...patch.drumLfo}));
 if(patch.performance){
  if(patch.performance.masterBpm)settings.performance.masterBpm=patch.performance.masterBpm;
  if(patch.performance.arp)Object.assign(settings.performance.arp,patch.performance.arp);
  if(patch.performance.game)Object.assign(settings.performance.game,patch.performance.game);
  if(patch.performance.routing)Object.assign(settings.performance.routing,patch.performance.routing);
  if(patch.performance.scale)settings.performance.scale=validateScaleSettings({...settings.performance.scale,...patch.performance.scale});
 }
 return Object.freeze({id,name,category,settings:validatePresetSettings(settings)});
}
// Octave effects deliberately use the existing Game Arp, not nonexistent pitch LFOs.
function octaveSequence(offsets){
 const sequence=defaultSequence();
 sequence.length=offsets.length;
 offsets.forEach((offset,i)=>{sequence.steps[i].offset=offset});
 return sequence;
}
// Keep legacy category labels stable in saved preset metadata while grouping the browser.
export const FACTORY_GROUPS=Object.freeze(['Showcase','Bass','Keys','Leads','Drums','SFX','FX']);
export const STARTUP_FACTORY_PRESET_ID='init';
export function factoryGroup(category){
 return ({Lead:'Leads',Pluck:'Keys',Pad:'Keys'})[category]??category;
}
export const FACTORY_PRESETS=Object.freeze([
 factory('init','Init','Showcase',{
  instrument:{voiceCount:9,unisonCount:3,mode:'poly',detune:24},
  engines:[
   {model:6581,pan:-44,voice:{wave:'square',attack:0,decay:.14,sustain:.84,release:.2,pulse:26,pwmDepth:32,pwmRate:2.6},
    filter:{cutoff:620,resonance:40,volume:90,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:.002,decay:.11,sustain:.92,release:.16,pulse:50,pwmDepth:8,pwmRate:1.4},
    filter:{cutoff:2200,resonance:44,volume:84,mode:'lowpass'}},
   {model:8580,pan:42,voice:{wave:'square',attack:0,decay:.09,sustain:.88,release:.12,pulse:16,pwmDepth:22,pwmRate:5.2},
    filter:{cutoff:7400,resonance:26,volume:78,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:5.5,depth:.38,target:'pwmDepth',engines:'3'},
   {enabled:true,wave:'sine',sync:true,syncDivision:4,rate:1,depth:.52,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sample-hold',rate:2.8,depth:.24,target:'pulse',engines:'2'}
  ],
  performance:{
   masterBpm:128,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'updown',rate:4,sync:true,localBpm:128},
   game:{enabled:false,style:'arcade',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 // Showcase stacks — original designs after Galway / Hubbard C64 palette (not transcriptions).
 factory('showcase-galway-epic','Galway · Epic Pad','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:11},
  engines:[
   {model:6581,pan:-40,voice:{wave:'triangle',attack:.62,decay:.58,sustain:.86,release:1.8},
    filter:{cutoff:1450,resonance:14,volume:76,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:.48,decay:.52,sustain:.8,release:1.55,pulse:54,pwmDepth:26,pwmRate:.34},
    filter:{cutoff:3200,resonance:20,volume:72,mode:'lowpass'}},
   {model:8580,pan:38,voice:{wave:'square',attack:.42,decay:.48,sustain:.74,release:1.4,pulse:62,pwmDepth:20,pwmRate:.26},
    filter:{cutoff:5600,resonance:16,volume:66,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:.14,depth:.55,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:.22,depth:.36,target:'pwmDepth',engines:'3'},
   {enabled:true,wave:'sine',rate:.08,depth:.22,target:'volume',engines:'2'}
  ],
  performance:{
   masterBpm:96,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'up',rate:2,sync:true,localBpm:96},
   game:{enabled:true,style:'adventure',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-hubbard-commando','Hubbard · Commando','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:14},
  engines:[
   {model:6581,pan:-44,voice:{wave:'square',attack:0,decay:.09,sustain:.72,release:.08,pulse:18,pwmDepth:6,pwmRate:3.2},
    filter:{cutoff:580,resonance:32,volume:88,mode:'lowpass'}},
   {model:6581,pan:-4,voice:{wave:'sawtooth',attack:0,decay:.07,sustain:.68,release:.07},
    filter:{cutoff:2680,resonance:36,volume:80,mode:'lowpass'}},
   {model:6581,pan:40,voice:{wave:'square',attack:0,decay:.05,sustain:.55,release:.05,pulse:12,pwmDepth:4,pwmRate:4.6},
    filter:{cutoff:6120,resonance:22,volume:74,mode:'highpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:6.4,depth:.2,target:'pulse',engines:'3'},
   {enabled:true,wave:'sawtooth',rate:4.5,depth:.16,target:'detune',engines:'all'},
   {enabled:true,wave:'square',sync:true,syncDivision:8,rate:1,depth:.28,target:'cutoff',engines:'2'}
  ],
  performance:{
   masterBpm:138,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'up',rate:4,sync:true,localBpm:138},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-hubbard-monty','Hubbard · Monty Drive','Showcase',{
  instrument:{voiceCount:3,unisonCount:3,mode:'legato',detune:20},
  engines:[
   {model:6581,pan:-32,voice:{wave:'sawtooth',attack:.004,decay:.13,sustain:.9,release:.18},
    filter:{cutoff:1980,resonance:38,volume:78,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:.003,decay:.11,sustain:.92,release:.14,pulse:24,pwmDepth:14,pwmRate:2.8},
    filter:{cutoff:4980,resonance:34,volume:74,mode:'bandpass'}},
   {model:8580,pan:34,voice:{wave:'sawtooth',attack:.002,decay:.09,sustain:.86,release:.12},
    filter:{cutoff:7800,resonance:18,volume:68,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:5.8,depth:.26,target:'cutoff',engines:'2'},
   {enabled:true,wave:'sine',rate:3.6,depth:.18,target:'pulse',engines:'2'},
   {enabled:true,wave:'triangle',sync:true,syncDivision:4,rate:1,depth:.3,target:'resonance',engines:'all'}
  ],
  performance:{
   masterBpm:132,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'updown',rate:4,sync:true,localBpm:132},
   game:{enabled:false,style:'adventure',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 // More Showcase stacks — original designs after classic C64 palettes (not transcriptions).
 factory('showcase-huelsbeck-deep','Hülsbeck · Deep Run','Showcase',{
  instrument:{voiceCount:9,unisonCount:3,mode:'poly',detune:22},
  engines:[
   {model:6581,pan:-46,voice:{wave:'sawtooth',attack:0,decay:.12,sustain:.86,release:.14},
    filter:{cutoff:1120,resonance:42,volume:86,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:0,decay:.09,sustain:.82,release:.11,pulse:22,pwmDepth:12,pwmRate:3.4},
    filter:{cutoff:2840,resonance:38,volume:82,mode:'lowpass'}},
   {model:8580,pan:44,voice:{wave:'sawtooth',attack:0,decay:.08,sustain:.78,release:.1},
    filter:{cutoff:5980,resonance:28,volume:76,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sawtooth',rate:5.2,depth:.22,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:7.8,depth:.18,target:'detune',engines:'all'},
   {enabled:true,wave:'square',sync:true,syncDivision:4,rate:1,depth:.26,target:'resonance',engines:'2'}
  ],
  performance:{
   masterBpm:152,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'up',rate:4,sync:true,localBpm:152},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-hubbard-sanxion','Hubbard · Sanxion Pulse','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'duo',detune:18},
  engines:[
   {model:6581,pan:-40,voice:{wave:'square',attack:0,decay:.11,sustain:.88,release:.12,pulse:14,pwmDepth:10,pwmRate:4.8},
    filter:{cutoff:520,resonance:36,volume:90,mode:'lowpass'}},
   {model:6581,pan:-2,voice:{wave:'sawtooth',attack:0,decay:.08,sustain:.72,release:.09},
    filter:{cutoff:3460,resonance:34,volume:78,mode:'bandpass'}},
   {model:6581,pan:42,voice:{wave:'square',attack:0,decay:.06,sustain:.64,release:.07,pulse:20,pwmDepth:8,pwmRate:5.6},
    filter:{cutoff:7020,resonance:24,volume:72,mode:'highpass'}}
  ],
  lfos:[
   {enabled:true,wave:'square',sync:true,syncDivision:8,rate:1,depth:.34,target:'pulse',engines:'3'},
   {enabled:true,wave:'triangle',rate:3.8,depth:.24,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sawtooth',rate:9.2,depth:.14,target:'detune',engines:'all'}
  ],
  performance:{
   masterBpm:126,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'random',rate:4,sync:true,localBpm:126},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-follin-ghouls','Follin · Layer Tempest','Showcase',{
  instrument:{voiceCount:9,unisonCount:3,mode:'poly',detune:35},
  engines:[
   {model:6581,pan:-48,voice:{wave:'sawtooth',attack:0,decay:.1,sustain:.9,release:.15},
    filter:{cutoff:1680,resonance:46,volume:84,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:0,decay:.08,sustain:.86,release:.12,pulse:28,pwmDepth:18,pwmRate:6.2},
    filter:{cutoff:3920,resonance:40,volume:80,mode:'bandpass'}},
   {model:8580,pan:46,voice:{wave:'triangle',attack:0,decay:.07,sustain:.82,release:.1},
    filter:{cutoff:7200,resonance:32,volume:74,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:11,depth:.2,target:'detune',engines:'all'},
   {enabled:true,wave:'sample-hold',rate:4.2,depth:.28,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sine',rate:2.6,depth:.22,target:'resonance',engines:'2'}
  ],
  performance:{
   masterBpm:118,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'updown',rate:4,sync:true,localBpm:118},
   game:{enabled:false,style:'arcade',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-tel-myth','Tel · Myth Assault','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:12},
  engines:[
   {model:6581,pan:-44,voice:{wave:'square',attack:0,decay:.07,sustain:.7,release:.08,pulse:10,pwmDepth:6,pwmRate:5.8},
    filter:{cutoff:640,resonance:34,volume:88,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:0,decay:.06,sustain:.66,release:.07},
    filter:{cutoff:2580,resonance:38,volume:82,mode:'lowpass'}},
   {model:8580,pan:44,voice:{wave:'square',attack:0,decay:.05,sustain:.6,release:.06,pulse:8,pwmDepth:4,pwmRate:7.2},
    filter:{cutoff:5280,resonance:26,volume:76,mode:'highpass'}}
  ],
  lfos:[
   {enabled:true,wave:'square',rate:8.6,depth:.26,target:'pulse',engines:'3'},
   {enabled:true,wave:'sawtooth',rate:5.4,depth:.18,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',sync:true,syncDivision:16,rate:1,depth:.3,target:'volume',engines:'2'}
  ],
  performance:{
   masterBpm:144,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'up',rate:4,sync:true,localBpm:144},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-daglish-gauntlet','Daglish · Gauntlet March','Showcase',{
  instrument:{voiceCount:3,unisonCount:3,mode:'legato',detune:14},
  engines:[
   {model:6581,pan:-36,voice:{wave:'square',attack:0,decay:.16,sustain:.92,release:.2,pulse:32,pwmDepth:10,pwmRate:2.2},
    filter:{cutoff:880,resonance:28,volume:86,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'triangle',attack:0,decay:.14,sustain:.88,release:.18},
    filter:{cutoff:2420,resonance:22,volume:80,mode:'lowpass'}},
   {model:6581,pan:36,voice:{wave:'sawtooth',attack:0,decay:.12,sustain:.84,release:.16},
    filter:{cutoff:4680,resonance:18,volume:74,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:.55,depth:.38,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:1.2,depth:.2,target:'pulse',engines:'1'},
   {enabled:true,wave:'sine',sync:true,syncDivision:2,rate:1,depth:.24,target:'volume',engines:'all'}
  ],
  performance:{
   masterBpm:104,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'up',rate:2,sync:true,localBpm:104},
   game:{enabled:false,style:'adventure',rate:4},
   scale:{tonic:2,id:'natural-minor',lock:true}
  }
 }),
 factory('showcase-whittaker-chain','Whittaker · Chain Drive','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:10},
  engines:[
   {model:6581,pan:-42,voice:{wave:'square',attack:0,decay:.2,sustain:.76,release:.22,pulse:20,pwmDepth:14,pwmRate:1.6},
    filter:{cutoff:720,resonance:30,volume:88,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:.002,decay:.16,sustain:.72,release:.18},
    filter:{cutoff:1980,resonance:32,volume:82,mode:'lowpass'}},
   {model:8580,pan:42,voice:{wave:'square',attack:0,decay:.14,sustain:.68,release:.16,pulse:26,pwmDepth:12,pwmRate:2.4},
    filter:{cutoff:4380,resonance:24,volume:76,mode:'bandpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:3.2,depth:.32,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sine',rate:1.4,depth:.26,target:'pwmDepth',engines:'3'},
   {enabled:true,wave:'square',rate:6.8,depth:.16,target:'pulse',engines:'2'}
  ],
  performance:{
   masterBpm:120,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'down',rate:4,sync:true,localBpm:120},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-gray-ninja','Gray · Ninja Stack','Showcase',{
  instrument:{voiceCount:3,unisonCount:3,mode:'legato',detune:24},
  engines:[
   {model:6581,pan:-34,voice:{wave:'triangle',attack:.006,decay:.18,sustain:.9,release:.22},
    filter:{cutoff:1580,resonance:36,volume:80,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:.004,decay:.15,sustain:.88,release:.2},
    filter:{cutoff:3680,resonance:32,volume:76,mode:'lowpass'}},
   {model:8580,pan:34,voice:{wave:'square',attack:.003,decay:.12,sustain:.84,release:.18,pulse:22,pwmDepth:16,pwmRate:3},
    filter:{cutoff:6120,resonance:22,volume:70,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:4.8,depth:.24,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:2.2,depth:.18,target:'detune',engines:'all'},
   {enabled:true,wave:'sine',rate:.9,depth:.22,target:'volume',engines:'2'}
  ],
  performance:{
   masterBpm:128,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'updown',rate:4,sync:true,localBpm:128},
   game:{enabled:false,style:'adventure',rate:4},
   scale:{tonic:5,id:'natural-minor',lock:true}
  }
 }),
 factory('showcase-fredgray-cauldron','Fred Gray · Cauldron Brew','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'duo',detune:20},
  engines:[
   {model:6581,pan:-40,voice:{wave:'square',attack:0,decay:.24,sustain:.82,release:.28,pulse:40,pwmDepth:28,pwmRate:1.2},
    filter:{cutoff:1380,resonance:24,volume:82,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'triangle',attack:.02,decay:.2,sustain:.78,release:.24},
    filter:{cutoff:3020,resonance:20,volume:76,mode:'lowpass'}},
   {model:8580,pan:40,voice:{wave:'square',attack:0,decay:.18,sustain:.74,release:.2,pulse:48,pwmDepth:22,pwmRate:.9},
    filter:{cutoff:5480,resonance:16,volume:72,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:.4,depth:.45,target:'pwmDepth',engines:'all'},
   {enabled:true,wave:'triangle',rate:.28,depth:.36,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sample-hold',rate:1.6,depth:.18,target:'pulse',engines:'3'}
  ],
  performance:{
   masterBpm:98,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'up',rate:2,sync:true,localBpm:98},
   game:{enabled:false,style:'adventure',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-tel-lotus','Tel · Lotus Sprint','Showcase',{
  instrument:{voiceCount:9,unisonCount:3,mode:'poly',detune:26},
  engines:[
   {model:6581,pan:-46,voice:{wave:'square',attack:0,decay:.08,sustain:.74,release:.09,pulse:16,pwmDepth:10,pwmRate:6.4},
    filter:{cutoff:980,resonance:36,volume:90,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:0,decay:.06,sustain:.7,release:.08},
    filter:{cutoff:3180,resonance:40,volume:84,mode:'lowpass'}},
   {model:8580,pan:46,voice:{wave:'square',attack:0,decay:.05,sustain:.66,release:.07,pulse:12,pwmDepth:8,pwmRate:7.8},
    filter:{cutoff:6480,resonance:30,volume:78,mode:'highpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:10.5,depth:.22,target:'detune',engines:'all'},
   {enabled:true,wave:'square',sync:true,syncDivision:8,rate:1,depth:.3,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sawtooth',rate:4.2,depth:.2,target:'pulse',engines:'3'}
  ],
  performance:{
   masterBpm:156,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'up',rate:4,sync:true,localBpm:156},
   game:{enabled:false,style:'arcade',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('showcase-maniacs-speedball','Maniacs · Speedball Riot','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:16},
  engines:[
   {model:6581,pan:-44,voice:{wave:'sawtooth',attack:0,decay:.1,sustain:.8,release:.11},
    filter:{cutoff:1420,resonance:44,volume:86,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:0,decay:.08,sustain:.76,release:.1,pulse:18,pwmDepth:14,pwmRate:4.2},
    filter:{cutoff:3280,resonance:38,volume:80,mode:'bandpass'}},
   {model:8580,pan:44,voice:{wave:'noise',attack:0,decay:.04,sustain:0,release:.03},
    filter:{cutoff:6200,resonance:28,volume:62,mode:'highpass'}}
  ],
  lfos:[
   {enabled:true,wave:'square',rate:12,depth:.24,target:'volume',engines:'3'},
   {enabled:true,wave:'triangle',rate:6.6,depth:.2,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sawtooth',rate:3.4,depth:.16,target:'detune',engines:'all'}
  ],
  performance:{
   masterBpm:148,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'random',rate:4,sync:true,localBpm:148},
   game:{enabled:false,style:'arcade',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 // TV-synth palettes (original; not transcriptions of Stu Phillips / Sylvester Levay scores).
 factory('showcase-knight-rider','Knight Rider · Pursuit','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'duo',detune:12},
  engines:[
   {model:6581,pan:-46,voice:{wave:'square',attack:0,decay:.14,sustain:.9,release:.16,pulse:12,pwmDepth:8,pwmRate:4.4},
    filter:{cutoff:420,resonance:38,volume:90,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:0,decay:.1,sustain:.82,release:.12,pulse:24,pwmDepth:18,pwmRate:5.6},
    filter:{cutoff:1880,resonance:36,volume:84,mode:'bandpass'}},
   {model:8580,pan:44,voice:{wave:'sawtooth',attack:.004,decay:.08,sustain:.78,release:.1},
    filter:{cutoff:4680,resonance:32,volume:78,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'square',sync:true,syncDivision:8,rate:1,depth:.32,target:'pulse',engines:'all'},
   {enabled:true,wave:'triangle',sync:true,syncDivision:4,rate:1,depth:.28,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sine',rate:6.2,depth:.16,target:'volume',engines:'2'}
  ],
  performance:{
   masterBpm:116,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'updown',rate:4,sync:true,localBpm:116},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:6,id:'harmonic-minor',lock:true}
  }
 }),
 factory('showcase-airwolf','Airwolf · Rotor Lift','Showcase',{
  instrument:{voiceCount:9,unisonCount:3,mode:'legato',detune:18},
  engines:[
   {model:6581,pan:-44,voice:{wave:'sawtooth',attack:.12,decay:.28,sustain:.88,release:.32},
    filter:{cutoff:1420,resonance:28,volume:82,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:.08,decay:.22,sustain:.9,release:.28,pulse:46,pwmDepth:12,pwmRate:1.8},
    filter:{cutoff:2880,resonance:34,volume:86,mode:'bandpass'}},
   {model:8580,pan:44,voice:{wave:'sawtooth',attack:.06,decay:.18,sustain:.86,release:.24},
    filter:{cutoff:5680,resonance:22,volume:80,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:.62,depth:.48,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:1.1,depth:.22,target:'resonance',engines:'2'},
   {enabled:true,wave:'sawtooth',sync:true,syncDivision:2,rate:1,depth:.2,target:'detune',engines:'all'}
  ],
  performance:{
   masterBpm:108,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'up',rate:4,sync:true,localBpm:108},
   game:{enabled:false,style:'adventure',rate:4},
   scale:{tonic:0,id:'major',lock:false}
  }
 }),
 factory('showcase-miami-vice','Miami Vice · Harbor Neon','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:14},
  engines:[
   {model:6581,pan:-40,voice:{wave:'triangle',attack:.32,decay:.62,sustain:.78,release:1.4},
    filter:{cutoff:2480,resonance:16,volume:72,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:.24,decay:.48,sustain:.74,release:1.1,pulse:56,pwmDepth:22,pwmRate:.6},
    filter:{cutoff:3920,resonance:20,volume:76,mode:'lowpass'}},
   {model:8580,pan:40,voice:{wave:'sawtooth',attack:.18,decay:.4,sustain:.7,release:.95},
    filter:{cutoff:5980,resonance:14,volume:68,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:.22,depth:.5,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:.38,depth:.32,target:'pwmDepth',engines:'2'},
   {enabled:true,wave:'sine',rate:1.6,depth:.18,target:'volume',engines:'3'}
  ],
  performance:{
   masterBpm:118,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'updown',rate:4,sync:true,localBpm:118},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:9,id:'mixolydian',lock:false}
  }
 }),
 factory('showcase-a-team','A-Team · Convoy Brass','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:16},
  engines:[
   {model:6581,pan:-44,voice:{wave:'square',attack:0,decay:.16,sustain:.86,release:.18,pulse:20,pwmDepth:6,pwmRate:3},
    filter:{cutoff:680,resonance:32,volume:88,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:.01,decay:.14,sustain:.84,release:.16},
    filter:{cutoff:2280,resonance:36,volume:84,mode:'bandpass'}},
   {model:8580,pan:44,voice:{wave:'sawtooth',attack:.008,decay:.12,sustain:.8,release:.14},
    filter:{cutoff:5120,resonance:26,volume:78,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',sync:true,syncDivision:4,rate:1,depth:.26,target:'cutoff',engines:'all'},
   {enabled:true,wave:'sine',rate:4.2,depth:.2,target:'volume',engines:'all'},
   {enabled:true,wave:'square',rate:7.5,depth:.14,target:'detune',engines:'2'}
  ],
  performance:{
   masterBpm:122,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'up',rate:4,sync:true,localBpm:122},
   game:{enabled:false,style:'action',rate:4},
   scale:{tonic:2,id:'major',lock:false}
  }
 }),
 factory('showcase-vangelis-blade','Vangelis · Blade Haze','Showcase',{
  instrument:{voiceCount:9,unisonCount:3,mode:'legato',detune:11},
  engines:[
   {model:6581,pan:-42,voice:{wave:'triangle',attack:.72,decay:.88,sustain:.92,release:2.2},
    filter:{cutoff:1180,resonance:20,volume:74,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'sawtooth',attack:.58,decay:.76,sustain:.88,release:1.9},
    filter:{cutoff:2680,resonance:24,volume:70,mode:'lowpass'}},
   {model:8580,pan:42,voice:{wave:'triangle',attack:.48,decay:.62,sustain:.84,release:1.6},
    filter:{cutoff:4380,resonance:18,volume:66,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:.08,depth:.62,target:'cutoff',engines:'all'},
   {enabled:true,wave:'triangle',rate:.14,depth:.38,target:'resonance',engines:'all'},
   {enabled:true,wave:'sample-hold',rate:.42,depth:.22,target:'detune',engines:'3'}
  ],
  performance:{
   masterBpm:92,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:true,pattern:'up',rate:2,sync:true,localBpm:92},
   game:{enabled:false,style:'adventure',rate:4},
   scale:{tonic:7,id:'dorian',lock:false}
  }
 }),
 factory('showcase-faltermeyer-axel','Faltermeyer · Beverly Pulse','Showcase',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:20},
  engines:[
   {model:6581,pan:-46,voice:{wave:'square',attack:0,decay:.1,sustain:.82,release:.11,pulse:34,pwmDepth:22,pwmRate:8.2},
    filter:{cutoff:820,resonance:34,volume:90,mode:'lowpass'}},
   {model:6581,pan:0,voice:{wave:'square',attack:0,decay:.08,sustain:.78,release:.1,pulse:42,pwmDepth:18,pwmRate:7.4},
    filter:{cutoff:2380,resonance:30,volume:84,mode:'bandpass'}},
   {model:8580,pan:46,voice:{wave:'sawtooth',attack:0,decay:.07,sustain:.74,release:.09},
    filter:{cutoff:4780,resonance:24,volume:78,mode:'lowpass'}}
  ],
  lfos:[
   {enabled:true,wave:'square',sync:true,syncDivision:16,rate:1,depth:.36,target:'pulse',engines:'all'},
   {enabled:true,wave:'triangle',rate:9.6,depth:.2,target:'pwmDepth',engines:'2'},
   {enabled:true,wave:'sawtooth',rate:5.8,depth:.16,target:'cutoff',engines:'3'}
  ],
  performance:{
   masterBpm:128,
   routing:{keyboard:'layer',arp:'layer',game:'layer'},
   arp:{enabled:true,latch:false,pattern:'updown',rate:4,sync:true,localBpm:128},
   game:{enabled:false,style:'arcade',rate:4},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 }),
 factory('deep-bass','Deep Bass','Bass',{voice:{wave:'square',decay:.22,sustain:.74,pulse:30},instrument:{voiceCount:2,detune:8},filter:{cutoff:1580,resonance:10,volume:79},performance:{game:{enabled:false}}}),
 factory('arcade-lead','Arcade Lead','Lead',{voice:{wave:'sawtooth',decay:.09,release:.13},instrument:{voiceCount:2,detune:12},filter:{cutoff:7100,resonance:17,volume:66},performance:{game:{enabled:true,style:'arcade'}}}),
 factory('chiptune-pluck','Chiptune Pluck','Pluck',{voice:{wave:'triangle',decay:.07,sustain:0,release:.07},instrument:{detune:0},filter:{cutoff:7800,resonance:2,volume:76},performance:{game:{enabled:false}}}),
 factory('pulsing-pad','Pulsing Pad','Pad',{voice:{attack:.55,decay:.44,sustain:.66,release:1.25,pwmDepth:30,pwmRate:.62},instrument:{voiceCount:3,detune:15},filter:{cutoff:4800,resonance:22,volume:69},performance:{game:{enabled:false}}}),
 factory('complex-layer-pad','Complex Layer Pad','Pad',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:16},
  engines:[
   {pan:-38,voice:{wave:'triangle',attack:.48,decay:.52,sustain:.73,release:1.45},filter:{cutoff:2650,resonance:15,volume:57}},
   {pan:0,voice:{wave:'sawtooth',attack:.4,decay:.46,sustain:.69,release:1.22},filter:{cutoff:5000,resonance:19,volume:61}},
   {pan:38,voice:{wave:'square',attack:.44,decay:.5,sustain:.66,release:1.32,pulse:52,pwmDepth:10,pwmRate:.4},filter:{cutoff:6200,resonance:23,volume:54}}
  ],
  lfos:[{enabled:true,wave:'triangle',rate:.2,depth:.44,target:'cutoff',engines:'3'}],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false}}
 }),
 factory('complex-layer-bass','Layered Sub Stack','Bass',{
  instrument:{voiceCount:4,unisonCount:2,mode:'poly',detune:11},
  engines:[
   {pan:-42,voice:{wave:'square',attack:.004,decay:.2,sustain:.8,release:.26,pulse:26},filter:{cutoff:480,resonance:24,volume:77}},
   {pan:-8,voice:{wave:'sawtooth',attack:.003,decay:.18,sustain:.72,release:.2},filter:{cutoff:1080,resonance:30,volume:69}},
   {pan:36,voice:{wave:'triangle',attack:.018,decay:.24,sustain:.64,release:.28},filter:{cutoff:1980,resonance:17,volume:51,mode:'highpass'}}
  ],
  lfos:[{enabled:true,wave:'sine',rate:.5,depth:.22,target:'cutoff',engines:'2'}],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false}}
 }),
 factory('complex-layer-lead','Stacked Chorus Lead','Leads',{
  instrument:{voiceCount:3,unisonCount:3,mode:'mono',detune:18},
  engines:[
   {pan:-30,voice:{wave:'sawtooth',attack:.002,decay:.12,sustain:.88,release:.16},filter:{cutoff:4800,resonance:14,volume:64}},
   {pan:0,voice:{wave:'square',attack:.002,decay:.1,sustain:.9,release:.12,pulse:22,pwmDepth:11,pwmRate:2.4},filter:{cutoff:7200,resonance:11,volume:58}},
   {pan:32,voice:{wave:'sawtooth',attack:.003,decay:.11,sustain:.85,release:.14},filter:{cutoff:8600,resonance:8,volume:50}}
  ],
  lfos:[{enabled:true,wave:'triangle',rate:4.2,depth:.14,target:'detune',engines:'all'}],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false},arp:{enabled:true,pattern:'up',rate:4,sync:true}}
 }),
 factory('complex-layer-brass','Brass Chord Layer','Keys',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:9},
  engines:[
   {pan:-34,voice:{wave:'square',attack:.018,decay:.32,sustain:.45,release:.35,pulse:40},filter:{cutoff:2400,resonance:26,volume:60}},
   {pan:2,voice:{wave:'sawtooth',attack:.02,decay:.35,sustain:.48,release:.38},filter:{cutoff:3100,resonance:31,volume:58}},
   {pan:34,voice:{wave:'square',attack:.015,decay:.28,sustain:.42,release:.32,pulse:56,pwmDepth:6,pwmRate:.8},filter:{cutoff:4500,resonance:19,volume:52}}
  ],
  lfos:[{enabled:true,wave:'sine',rate:.58,depth:.17,target:'resonance',engines:'2'}],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false}}
 }),
 factory('complex-layer-wash','Shimmer Drone Wash','FX',{
  instrument:{voiceCount:4,unisonCount:1,mode:'poly',detune:0},
  engines:[
   {pan:-40,voice:{wave:'triangle',attack:.8,decay:.6,sustain:.82,release:2.2},filter:{cutoff:1900,resonance:10,volume:54}},
   {pan:0,voice:{wave:'sawtooth',attack:.7,decay:.55,sustain:.76,release:1.9},filter:{cutoff:3600,resonance:24,volume:48}},
   {pan:38,voice:{wave:'noise',attack:.5,decay:.48,sustain:.55,release:1.6},filter:{cutoff:8200,resonance:6,volume:38,mode:'bandpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:.18,depth:.35,target:'cutoff',engines:'1'},
   {enabled:true,wave:'sine',rate:.1,depth:.27,target:'volume',engines:'3'}
  ],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false}}
 }),
 // Layer stacks inspired by film/game/era palettes (original designs, not transcriptions).
 factory('complex-layer-nexus','Nexus Skyline Layer','FX',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:14},
  engines:[
   {model:6581,pan:-36,voice:{wave:'sawtooth',attack:.62,decay:.58,sustain:.78,release:2.4},filter:{cutoff:3100,resonance:32,volume:56}},
   {pan:0,voice:{wave:'triangle',attack:.55,decay:.52,sustain:.74,release:2.1},filter:{cutoff:1750,resonance:18,volume:52}},
   {model:8580,pan:34,voice:{wave:'square',attack:.48,decay:.5,sustain:.7,release:1.9,pulse:58,pwmDepth:7,pwmRate:.32},filter:{cutoff:4300,resonance:24,volume:48}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:.12,depth:.4,target:'cutoff',engines:'1'},
   {enabled:true,wave:'sine',rate:.08,depth:.24,target:'volume',engines:'2'}
  ],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false}}
 }),
 factory('complex-layer-commando','Raid Assault Layer','Bass',{
  instrument:{voiceCount:4,unisonCount:2,mode:'poly',detune:8},
  engines:[
   {pan:-40,voice:{wave:'square',attack:0,decay:.12,sustain:.64,release:.08,pulse:22},filter:{cutoff:720,resonance:26,volume:81}},
   {pan:0,voice:{wave:'sawtooth',attack:0,decay:.1,sustain:.6,release:.08},filter:{cutoff:3050,resonance:24,volume:67}},
   {pan:38,voice:{wave:'square',attack:0,decay:.06,sustain:.44,release:.05,pulse:14},filter:{cutoff:6600,resonance:14,volume:57}}
  ],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false},arp:{enabled:true,pattern:'up',rate:4,sync:true}}
 }),
 factory('complex-layer-turrican','Heroic Storm Layer','Leads',{
  instrument:{voiceCount:3,unisonCount:3,mode:'legato',detune:22},
  engines:[
   {pan:-34,voice:{wave:'sawtooth',attack:.003,decay:.15,sustain:.83,release:.2},filter:{cutoff:1180,resonance:40,volume:73}},
   {pan:0,voice:{wave:'sawtooth',attack:.002,decay:.11,sustain:.87,release:.17},filter:{cutoff:4950,resonance:46,volume:65}},
   {pan:36,voice:{wave:'square',attack:.002,decay:.08,sustain:.81,release:.13,pulse:28,pwmDepth:9,pwmRate:1.9},filter:{cutoff:7400,resonance:17,volume:55}}
  ],
  lfos:[{enabled:true,wave:'triangle',rate:.32,depth:.22,target:'resonance',engines:'2'}],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false},arp:{enabled:true,pattern:'up',rate:4,sync:true}}
 }),
 factory('complex-layer-synthpop','Neon Chorus Layer','Keys',{
  instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:17},
  engines:[
   {pan:-32,voice:{wave:'square',attack:.01,decay:.26,sustain:.73,release:.4,pulse:46,pwmDepth:17,pwmRate:1.05},filter:{cutoff:5250,resonance:15,volume:61}},
   {pan:2,voice:{wave:'sawtooth',attack:.015,decay:.3,sustain:.75,release:.45},filter:{cutoff:4800,resonance:11,volume:58}},
   {pan:32,voice:{wave:'triangle',attack:.02,decay:.26,sustain:.68,release:.4},filter:{cutoff:7200,resonance:6,volume:52}}
  ],
  lfos:[
   {enabled:true,wave:'sine',rate:6.5,depth:.18,target:'volume',engines:'3'},
   {enabled:true,wave:'triangle',rate:.5,depth:.1,target:'detune',engines:'all'}
  ],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false},arp:{enabled:true,pattern:'updown',rate:4,sync:true}}
 }),
 factory('complex-layer-firestart','Firestart Corridor Layer','FX',{
  instrument:{voiceCount:4,unisonCount:2,mode:'legato',detune:13},
  engines:[
   {pan:-39,voice:{wave:'square',attack:.006,decay:.26,sustain:.85,release:.52,pulse:36},filter:{cutoff:680,resonance:33,volume:75}},
   {pan:0,voice:{wave:'sawtooth',attack:.12,decay:.42,sustain:.76,release:1.1},filter:{cutoff:2050,resonance:39,volume:58,mode:'bandpass'}},
   {pan:36,voice:{wave:'noise',attack:.2,decay:.5,sustain:.4,release:.85},filter:{cutoff:3400,resonance:22,volume:34,mode:'bandpass'}}
  ],
  lfos:[
   {enabled:true,wave:'triangle',rate:.2,depth:.32,target:'cutoff',engines:'2'},
   {enabled:true,wave:'sample-hold',rate:.45,depth:.22,target:'volume',engines:'3'}
  ],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false},arp:{enabled:false}}
 }),
 factory('soft-flute','Soft Flute','Lead',{voice:{wave:'triangle',attack:.06,decay:.22,sustain:.87,release:.33},instrument:{detune:0},filter:{cutoff:4500,resonance:6,volume:79},performance:{game:{enabled:false}}}),
 factory('filter-motion','Filter Motion','FX',{filter:{cutoff:4000,resonance:58,volume:59},lfos:[{enabled:true,wave:'triangle',rate:.28,depth:.58,target:'cutoff'}],performance:{game:{enabled:false}}}),
 // One-shot game/UI effects — mono SID 1 default; tap a key and release quickly.
 factory('sfx-laser-zap','Laser Zap','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'square',attack:0,decay:.12,sustain:0,release:.04,pulse:20,pitchEnvelope:FACTORY_PITCH.laser},
  filter:{cutoff:5200,resonance:32,volume:82},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-phaser-blast','Phaser Blast','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'square',attack:0,decay:.16,sustain:0,release:.06,pulse:48,pwmDepth:28,pwmRate:9.5},
  filter:{cutoff:2400,resonance:44,volume:78,mode:'bandpass'},
  lfos:[{enabled:true,wave:'triangle',rate:14,depth:.45,target:'cutoff'}],
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-coin-pickup','Coin Pickup','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'triangle',attack:0,decay:.09,sustain:0,release:.03,pitchEnvelope:{enabled:true,interpolation:'linear',end:'zero',points:[{ms:0,semitones:-4},{ms:45,semitones:14},{ms:90,semitones:0}]}},
  filter:{cutoff:7200,resonance:8,volume:76},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-power-up','Power Up','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'square',attack:0,decay:.22,sustain:.4,release:.12,pulse:36,pitchEnvelope:{enabled:true,interpolation:'curve',end:'hold',points:[{ms:0,semitones:-12},{ms:120,semitones:7},{ms:280,semitones:12}]}},
  filter:{cutoff:3800,resonance:24,volume:80},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-game-over','Game Over','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'sawtooth',attack:0,decay:.38,sustain:.2,release:.28,pitchEnvelope:{enabled:true,interpolation:'linear',end:'zero',points:[{ms:0,semitones:5},{ms:200,semitones:-10},{ms:520,semitones:-19}]}},
  filter:{cutoff:1680,resonance:28,volume:74},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-explosion-boom','Explosion Boom','SFX',{
  instrument:{voiceCount:3,unisonCount:1,mode:'mono',detune:0},
  engines:[
   {voice:{wave:'noise',attack:0,decay:.32,sustain:0,release:.12},filter:{cutoff:680,resonance:22,volume:88,mode:'lowpass'}},
   {voice:{wave:'noise',attack:0,decay:.26,sustain:0,release:.08},filter:{cutoff:2200,resonance:36,volume:76,mode:'bandpass'}},
   {voice:{wave:'triangle',attack:0,decay:.18,sustain:0,release:.06,pitchEnvelope:FACTORY_PITCH.kick},filter:{cutoff:420,resonance:18,volume:82}}
  ],
  performance:{routing:{keyboard:'layer',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-alarm-siren','Alarm Siren','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'square',attack:.01,decay:.04,sustain:.92,release:.2,pulse:24},
  filter:{cutoff:1480,resonance:40,volume:72,mode:'bandpass'},
  lfos:[{enabled:true,wave:'triangle',rate:2.8,depth:.95,target:'cutoff'}],
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-ui-confirm','UI Confirm','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'triangle',attack:0,decay:.06,sustain:0,release:.02,pitchEnvelope:{enabled:true,interpolation:'linear',end:'zero',points:[{ms:0,semitones:0},{ms:35,semitones:7}]}},
  filter:{cutoff:6400,resonance:6,volume:70},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-ui-error','UI Error','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'square',attack:0,decay:.08,sustain:0,release:.03,pulse:14,pitchEnvelope:{enabled:true,interpolation:'linear',end:'zero',points:[{ms:0,semitones:3},{ms:50,semitones:-7},{ms:110,semitones:-12}]}},
  filter:{cutoff:920,resonance:34,volume:76},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-whoosh','Whoosh','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'noise',attack:0,decay:.24,sustain:0,release:.08,pitchEnvelope:{enabled:true,interpolation:'linear',end:'zero',points:[{ms:0,semitones:8},{ms:80,semitones:-4},{ms:200,semitones:-16}]}},
  filter:{cutoff:5600,resonance:14,volume:68,mode:'highpass'},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-jump','Jump Blip','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'triangle',attack:0,decay:.11,sustain:0,release:.04,pitchEnvelope:{enabled:true,interpolation:'curve',end:'zero',points:[{ms:0,semitones:-6},{ms:40,semitones:10}]}},
  filter:{cutoff:5800,resonance:10,volume:78},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-hit-damage','Hit Damage','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'noise',attack:0,decay:.11,sustain:0,release:.04},
  filter:{cutoff:4200,resonance:42,volume:72,mode:'bandpass'},
  lfos:[{enabled:true,wave:'square',rate:18,depth:.55,target:'volume'}],
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-door-slide','Door Slide','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'sawtooth',attack:.02,decay:.28,sustain:.5,release:.35,pitchEnvelope:{enabled:true,interpolation:'linear',end:'hold',points:[{ms:0,semitones:-14},{ms:220,semitones:4}]}},
  filter:{cutoff:1120,resonance:18,volume:66},
  lfos:[{enabled:true,wave:'sine',rate:3.5,depth:.35,target:'volume'}],
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-teleport','Teleport Spark','SFX',{
  instrument:{voiceCount:3,unisonCount:1,mode:'mono',detune:0},
  engines:[
   {voice:{wave:'square',attack:0,decay:.14,sustain:0,release:.05,pulse:22,pitchEnvelope:FACTORY_PITCH.laser},filter:{cutoff:4800,resonance:30,volume:76}},
   {voice:{wave:'triangle',attack:0,decay:.1,sustain:0,release:.04,pitchEnvelope:{enabled:true,interpolation:'linear',end:'zero',points:[{ms:0,semitones:12},{ms:70,semitones:-8}]}},filter:{cutoff:7600,resonance:12,volume:64}},
   {voice:{wave:'noise',attack:0,decay:.08,sustain:0,release:.03},filter:{cutoff:8800,resonance:20,volume:52,mode:'highpass'}}
  ],
  performance:{routing:{keyboard:'layer',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-engine-rev','Engine Rev','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'sawtooth',attack:.08,decay:.2,sustain:.75,release:.4,pitchEnvelope:{enabled:true,interpolation:'curve',end:'hold',points:[{ms:0,semitones:-16},{ms:180,semitones:-4},{ms:420,semitones:2}]}},
  filter:{cutoff:820,resonance:26,volume:80},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 factory('sfx-countdown-tick','Countdown Tick','SFX',{
  instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:0},
  voice:{wave:'square',attack:0,decay:.04,sustain:0,release:.01,pulse:50},
  filter:{cutoff:6100,resonance:4,volume:74},
  performance:{routing:{keyboard:'sid1',arp:'sid1',game:'sid1'},arp:{enabled:false},game:{enabled:false}}
 }),
 // Original C64-inspired prototypes. These are sound-design starting points, not transcriptions.
 factory('tight-pulse-bass','Tight Pulse Bass','Bass',{voice:{wave:'square',attack:0,decay:.09,sustain:.28,release:.06,pulse:22},filter:{cutoff:1180,resonance:22,volume:74},performance:{game:{enabled:false}}}),
 factory('shimmer-pwm-keys','Shimmer PWM Keys','Keys',{voice:{wave:'square',attack:.05,decay:.42,sustain:.64,release:.68,pulse:43,pwmDepth:16,pwmRate:.48},filter:{cutoff:4600,resonance:14,volume:58},performance:{game:{enabled:false}}}),
 factory('bright-pulse-lead','Bright Pulse Lead','Leads',{voice:{wave:'square',attack:.002,decay:.12,sustain:.84,release:.11,pulse:17},filter:{cutoff:7350,resonance:10,volume:65},lfos:[{enabled:true,wave:'sine',rate:5.2,depth:.09,target:'pulse'}],performance:{game:{enabled:false}}}),
 factory('noise-snare','Noise Snare','Drums',{voice:{wave:'noise',attack:0,decay:.11,sustain:0,release:.015,pitchEnvelope:FACTORY_PITCH.snare},filter:{cutoff:6200,resonance:10,volume:70,mode:'lowpass'},performance:{game:{enabled:false}}}),
 // Five additional original sounds in each category; retains the four approved prototypes.
 // Bass: contrasting PWM, filter, tone and octave-arpeggio behaviors.
 factory('pwm-drive-bass','PWM Drive Bass','Bass',{voice:{wave:'square',attack:.002,decay:.18,sustain:.58,release:.09,pulse:32,pwmDepth:21,pwmRate:1.22},filter:{cutoff:1780,resonance:22,volume:71},performance:{game:{enabled:false}}}),
 factory('filtered-saw-bass','Filtered Saw Bass','Bass',{voice:{wave:'sawtooth',attack:.002,decay:.16,sustain:.45,release:.11},filter:{cutoff:880,resonance:42,volume:76},performance:{game:{enabled:false}}}),
 factory('hollow-square-bass','Hollow Square Bass','Bass',{voice:{wave:'square',attack:.005,decay:.22,sustain:.68,release:.14,pulse:48},filter:{cutoff:1680,resonance:31,volume:74,mode:'bandpass'},performance:{game:{enabled:false}}}),
 factory('octave-runner-bass','Octave Runner Bass','Bass',{voice:{wave:'square',attack:.002,decay:.07,sustain:.54,release:.05,pulse:23},filter:{cutoff:2580,resonance:13,volume:68},performance:{game:{enabled:true,style:'custom',rate:8,sequence:octaveSequence([0,12,0,12])}}}),
 factory('warm-triangle-bass','Warm Triangle Bass','Bass',{voice:{wave:'triangle',attack:.012,decay:.22,sustain:.8,release:.2},filter:{cutoff:2280,resonance:8,volume:85},performance:{game:{enabled:false}}}),
 // Keys: monophonic plucks and bells alongside genuinely playable Poly patches.
 factory('chip-pluck-keys','Chip Pluck Keys','Keys',{voice:{wave:'triangle',attack:0,decay:.08,sustain:0,release:.05},filter:{cutoff:6900,resonance:5,volume:80},performance:{game:{enabled:false}}}),
 factory('bell-keys','Bell Keys','Keys',{voice:{wave:'triangle',attack:0,decay:1.02,sustain:0,release:.45},filter:{cutoff:8000,resonance:1,volume:78},performance:{game:{enabled:false}}}),
 factory('chord-stab-keys','Chord Stab Keys','Keys',{voice:{wave:'sawtooth',attack:.002,decay:.25,sustain:.36,release:.18},instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:9},filter:{cutoff:3720,resonance:23,volume:54},performance:{game:{enabled:false}}}),
 factory('organ-keys','Organ Keys','Keys',{voice:{wave:'square',attack:.01,decay:.07,sustain:1,release:.12,pulse:48},instrument:{voiceCount:4,unisonCount:1,mode:'poly',detune:0},filter:{cutoff:5550,resonance:7,volume:54},performance:{game:{enabled:false}}}),
 factory('slow-glass-pad','Slow Glass Pad','Keys',{voice:{wave:'square',attack:.82,decay:.58,sustain:.64,release:1.75,pulse:44,pwmDepth:23,pwmRate:.32},instrument:{voiceCount:4,unisonCount:1,mode:'poly',detune:0},filter:{cutoff:3900,resonance:16,volume:55},lfos:[{enabled:true,wave:'sine',rate:.16,depth:.22,target:'cutoff'}],performance:{game:{enabled:false}}}),
 // Leads: legato, resonant pulse, volume tremolo, octave stepping, and filtered saw.
 factory('nasal-pwm-lead','Nasal PWM Lead','Leads',{voice:{wave:'square',attack:.002,decay:.14,sustain:.84,release:.14,pulse:14,pwmDepth:14,pwmRate:1.45},filter:{cutoff:2480,resonance:41,volume:64,mode:'bandpass'},performance:{game:{enabled:false}}}),
 factory('smooth-legato-lead','Smooth Legato Lead','Leads',{voice:{wave:'triangle',attack:.032,decay:.26,sustain:.89,release:.3},instrument:{voiceCount:1,unisonCount:1,mode:'legato',detune:0},filter:{cutoff:5750,resonance:5,volume:77},performance:{game:{enabled:false}}}),
 factory('tremolo-pulse-lead','Tremolo Pulse Lead','Leads',{voice:{wave:'square',attack:.007,decay:.2,sustain:.79,release:.2,pulse:36},filter:{cutoff:5950,resonance:13,volume:67},lfos:[{enabled:true,wave:'triangle',rate:5.2,depth:.38,target:'volume'}],performance:{game:{enabled:false}}}),
 factory('octave-chase-lead','Octave Chase Lead','Leads',{voice:{wave:'square',attack:.002,decay:.07,sustain:.73,release:.08,pulse:22},filter:{cutoff:5850,resonance:14,volume:63},performance:{game:{enabled:true,style:'custom',rate:8,sequence:octaveSequence([0,12,7,12])}}}),
 factory('filtered-saw-lead','Filtered Saw Lead','Leads',{voice:{wave:'sawtooth',attack:.003,decay:.2,sustain:.72,release:.19},filter:{cutoff:2750,resonance:44,volume:59},lfos:[{enabled:true,wave:'sine',rate:.75,depth:.25,target:'cutoff'}],performance:{game:{enabled:false}}}),
 // Drums: kick/tom use pitch templates; hats/clap remain noise-focused.
 factory('low-thud-kick','Low Thud Kick','Drums',{voice:{wave:'triangle+noise',attack:0,decay:.21,sustain:.21,release:.02,pitchEnvelope:FACTORY_PITCH.kick},filter:{cutoff:540,resonance:11,volume:92},performance:{game:{enabled:false}}}),
 factory('closed-noise-hat','Closed Noise Hat','Drums',{voice:{wave:'noise',attack:0,decay:.022,sustain:0,release:.01},filter:{cutoff:7600,resonance:7,volume:60,mode:'lowpass'},performance:{game:{enabled:false}}}),
 factory('open-noise-hat','Open Noise Hat','Drums',{voice:{wave:'noise+triangle',attack:0,decay:.36,sustain:0,release:.1},filter:{cutoff:8000,resonance:9,volume:58,mode:'lowpass'},performance:{game:{enabled:false}}}),
 factory('noise-clap','Noise Clap','Drums',{voice:{wave:'noise',attack:0,decay:.14,sustain:0,release:.06,pitchEnvelope:FACTORY_PITCH.clap},filter:{cutoff:3000,resonance:30,volume:68,mode:'bandpass'},lfos:[{enabled:true,wave:'square',rate:18,depth:.52,target:'volume'}],performance:{game:{enabled:false}}}),
 factory('low-tom','Low Tom','Drums',{voice:{wave:'triangle',attack:0,decay:.26,sustain:0,release:.07,pitchEnvelope:FACTORY_PITCH.tom},filter:{cutoff:1180,resonance:21,volume:84},performance:{game:{enabled:false}}})
]);
export const SHOWCASE_FACTORY_IDS=Object.freeze(
 FACTORY_PRESETS.filter(p=>p.category==='Showcase').map(p=>p.id)
);
export const SFX_FACTORY_IDS=Object.freeze(
 FACTORY_PRESETS.filter(p=>p.category==='SFX').map(p=>p.id)
);
export const LAYER_FACTORY_IDS=Object.freeze(
 FACTORY_PRESETS.filter(p=>p.id.startsWith('complex-layer-')).map(p=>p.id)
);
function unique(presets){
 const names=new Set(),ids=new Set();
 for(const p of presets){
  const key=p.name.toLowerCase();
  if(names.has(key)||ids.has(p.id))throw new RangeError('Duplicate user preset: '+p.name);
  names.add(key);ids.add(p.id);
 }
}
function readStoredPresetBank(storage,key,expectedVersion){
 const raw=storage.getItem(key);
 if(raw===null)return null;
 const bank=object(JSON.parse(raw),'stored preset bank');
 if(bank.version!==expectedVersion||!Array.isArray(bank.presets)||bank.presets.length>MAX_USER_PRESETS)
  throw new RangeError('Unsupported or oversized preset bank');
 return bank.presets.map(p=>validatePreset(p,{requireId:true}));
}
export function readUserPresets(storage){
 let items=readStoredPresetBank(storage,PRESET_STORAGE_KEY,PRESET_VERSION);
 if(items!==null){unique(items);return items}
 const v4=readStoredPresetBank(storage,LEGACY_PRESET_STORAGE_KEY_V4,4);
 if(v4!==null){
  items=v4.map(p=>({...p,settings:validatePresetSettings(p.settings)}));
  unique(items);
  writeUserPresets(storage,items);
  storage.removeItem(LEGACY_PRESET_STORAGE_KEY_V4);
  return items;
 }
 const legacy=readStoredPresetBank(storage,LEGACY_PRESET_STORAGE_KEY_V3,3);
 if(legacy===null)return [];
 items=legacy.map(p=>({...p,settings:validatePresetSettings(p.settings)}));
 unique(items);
 writeUserPresets(storage,items);
 storage.removeItem(LEGACY_PRESET_STORAGE_KEY_V3);
 return items;
}
export function writeUserPresets(storage,presets){
 if(!Array.isArray(presets)||presets.length>MAX_USER_PRESETS)throw new RangeError('Too many presets');
 const safe=presets.map(p=>validatePreset(p,{requireId:true}));
 unique(safe);
 // Validate and serialize before touching storage. One atomic storage update.
 storage.setItem(PRESET_STORAGE_KEY,JSON.stringify({version:PRESET_VERSION,presets:safe}));
 return safe;
}
export function exportPreset(preset){
 return JSON.stringify({type:'project6581-preset',version:PRESET_VERSION,preset:validatePreset(preset)},null,2);
}
export function exportPresetBank(presets){
 const safe=presets.map(p=>validatePreset(p));
 if(safe.length>MAX_USER_PRESETS)throw new RangeError('Too many presets to export');
 return JSON.stringify({type:'project6581-preset-bank',version:PRESET_VERSION,presets:safe},null,2);
}
function normalizeImportedPreset(preset){
 const base=object(preset,'preset');
 return validatePreset({...base,settings:validatePresetSettings(base.settings)});
}
export function importPresetFile(raw){
 if(typeof raw!=='string'||raw.length>2*1024*1024)throw new RangeError('Preset file is too large');
 const file=object(JSON.parse(raw),'preset file');
 if(!IMPORTABLE_PRESET_VERSIONS.includes(file.version))
  throw new RangeError('Unsupported preset version. Import v3, v4, or v5 JSON only; older formats are not supported.');
 const rawPresets=file.type==='project6581-preset'?[file.preset]
  :file.type==='project6581-preset-bank'&&Array.isArray(file.presets)?file.presets:null;
 const presets=rawPresets?rawPresets.map(normalizeImportedPreset):null;
 if(!presets||presets.length>MAX_USER_PRESETS)throw new TypeError('Not a Project6581 preset file');
 const names=new Set();
 for(const p of presets){const n=p.name.toLowerCase();if(names.has(n))throw new RangeError('Duplicate name in imported bank');names.add(n)}
 return presets;
}
