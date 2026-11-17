import {defaultSequence,validateSequence} from './game-step-sequencer.js';
import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from './pitch-envelope.js';
import {pitchEnvelopeTemplates} from './pitch-envelope-editor.js';
const FACTORY_PITCH=pitchEnvelopeTemplates();
import {createDefaultEngines,DEFAULT_ROUTING,ROUTE_OPTIONS,defaultEngineSettings} from './sid-engines.js';
import {validateScaleSettings} from './western-scales.js';
import {LFO_TARGET_ORDER,LFO_WAVES} from './lfo-modulation.js';
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
export function defaultPresetSettings(){
 return validatePresetSettings({
  sound:{
   engines:defaultEngineBank(),
   instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:12},
   lfos:Array.from({length:3},(_,i)=>({enabled:false,sync:false,wave:'sine',rate:1,syncDivision:4,depth:0,target:'cutoff',phase:0,seed:i,engines:'all'}))
  },
  performance:{
   masterBpm:120,
   routing:{...DEFAULT_ROUTING},
   arp:{enabled:false,latch:false,pattern:'up',rate:4,sync:true,localBpm:120},
   game:{enabled:true,style:'action',rate:4,sequence:defaultSequence()},
   scale:{tonic:0,id:'chromatic',lock:false}
  }
 });
}
function validateEngine(engine,index){
 const e=object(engine,'SID '+(index+1));
 const voice=attachDefaultPitchEnvelope(e.voice??{});
 const filter=object(e.filter??defaultEngineSettings().filter,'filter');
 return {
  model:choice(e.model,'chip model',[6581,8580]),
  pan:numeric(e.pan??0,'pan',-100,100),
  voice:{
   enabled:boolean(voice.enabled,'enabled'),wave:choice(voice.wave,'waveform',WAVES),
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
 if(Array.isArray(sound.engines)&&sound.engines.length===3){
  return sound.engines.map((engine,i)=>validateEngine(engine,i));
 }
 const model=choice(sound.model??6581,'chip model',[6581,8580]);
 const engines=defaultEngineBank();
 engines[0].model=model;
 const v=attachDefaultPitchEnvelope(sound.voice);
 const filter=object(sound.filter??engines[0].filter,'filter');
 Object.assign(engines[0].voice,{
  enabled:boolean(v.enabled,'enabled'),wave:choice(v.wave,'waveform',WAVES),
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
   })
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
 if(patch.performance){
  if(patch.performance.masterBpm)settings.performance.masterBpm=patch.performance.masterBpm;
  if(patch.performance.arp)Object.assign(settings.performance.arp,patch.performance.arp);
  if(patch.performance.game)Object.assign(settings.performance.game,patch.performance.game);
  if(patch.performance.routing)Object.assign(settings.performance.routing,patch.performance.routing);
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
export const FACTORY_GROUPS=Object.freeze(['Bass','Keys','Leads','Drums','FX']);
export function factoryGroup(category){
 return ({Lead:'Leads',Pluck:'Keys',Pad:'Keys'})[category]??category;
}
export const FACTORY_PRESETS=Object.freeze([
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
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:true,style:'arcade'}}
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
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:true,style:'action',rate:8},arp:{enabled:true,pattern:'up',rate:4,sync:true}}
 }),
 factory('complex-layer-turrican','Heroic Storm Layer','Leads',{
  instrument:{voiceCount:3,unisonCount:3,mode:'legato',detune:22},
  engines:[
   {pan:-34,voice:{wave:'sawtooth',attack:.003,decay:.15,sustain:.83,release:.2},filter:{cutoff:1180,resonance:40,volume:73}},
   {pan:0,voice:{wave:'sawtooth',attack:.002,decay:.11,sustain:.87,release:.17},filter:{cutoff:4950,resonance:46,volume:65}},
   {pan:36,voice:{wave:'square',attack:.002,decay:.08,sustain:.81,release:.13,pulse:28,pwmDepth:9,pwmRate:1.9},filter:{cutoff:7400,resonance:17,volume:55}}
  ],
  lfos:[{enabled:true,wave:'triangle',rate:.32,depth:.22,target:'resonance',engines:'2'}],
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:true,style:'adventure',rate:4}}
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
  performance:{routing:{keyboard:'layer',arp:'layer',game:'sid1'},game:{enabled:false},arp:{enabled:true,pattern:'updown',rate:8,sync:true}}
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
 // Original C64-inspired prototypes. These are sound-design starting points, not transcriptions.
 factory('tight-pulse-bass','Tight Pulse Bass','Bass',{voice:{wave:'square',attack:0,decay:.09,sustain:.28,release:.06,pulse:22},filter:{cutoff:1180,resonance:22,volume:74},performance:{game:{enabled:false}}}),
 factory('shimmer-pwm-keys','Shimmer PWM Keys','Keys',{voice:{wave:'square',attack:.05,decay:.42,sustain:.64,release:.68,pulse:43,pwmDepth:16,pwmRate:.48},filter:{cutoff:4600,resonance:14,volume:58},performance:{game:{enabled:false}}}),
 factory('bright-pulse-lead','Bright Pulse Lead','Leads',{voice:{wave:'square',attack:.002,decay:.12,sustain:.84,release:.11,pulse:17},filter:{cutoff:7350,resonance:10,volume:65},lfos:[{enabled:true,wave:'sine',rate:5.2,depth:.09,target:'pulse'}],performance:{game:{enabled:false}}}),
 factory('noise-snare','Noise Snare','Drums',{voice:{wave:'noise',attack:0,decay:.09,sustain:0,release:.01},filter:{cutoff:6200,resonance:10,volume:70,mode:'highpass'},performance:{game:{enabled:false}}}),
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
 factory('low-thud-kick','Low Thud Kick','Drums',{voice:{wave:'triangle',attack:0,decay:.18,sustain:0,release:.01,pitchEnvelope:FACTORY_PITCH.kick},filter:{cutoff:540,resonance:11,volume:92},performance:{game:{enabled:false}}}),
 factory('closed-noise-hat','Closed Noise Hat','Drums',{voice:{wave:'noise',attack:0,decay:.03,sustain:0,release:.01},filter:{cutoff:7600,resonance:7,volume:60,mode:'highpass'},performance:{game:{enabled:false}}}),
 factory('open-noise-hat','Open Noise Hat','Drums',{voice:{wave:'noise',attack:0,decay:.34,sustain:0,release:.1},filter:{cutoff:8000,resonance:9,volume:58,mode:'highpass'},performance:{game:{enabled:false}}}),
 factory('noise-clap','Noise Clap','Drums',{voice:{wave:'noise',attack:0,decay:.14,sustain:0,release:.06},filter:{cutoff:3000,resonance:30,volume:68,mode:'bandpass'},lfos:[{enabled:true,wave:'square',rate:18,depth:.52,target:'volume'}],performance:{game:{enabled:false}}}),
 factory('low-tom','Low Tom','Drums',{voice:{wave:'triangle',attack:0,decay:.26,sustain:0,release:.07,pitchEnvelope:FACTORY_PITCH.tom},filter:{cutoff:1180,resonance:21,volume:84},performance:{game:{enabled:false}}})
]);
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
