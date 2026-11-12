import {defaultSequence,validateSequence} from './game-step-sequencer.js';
import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from './pitch-envelope.js';
// Project6581 preset format v4: adds per-voice pitchEnvelope (v3 imports upgrade with envelope off).
export const PRESET_VERSION=4;
export const PRESET_STORAGE_KEY='project6581.user-presets.v4';
export const LEGACY_PRESET_STORAGE_KEY_V3='project6581.user-presets.v3';
export const IMPORTABLE_PRESET_VERSIONS=Object.freeze([3,4]);
export const MAX_USER_PRESETS=100;
const WAVES=['triangle','sawtooth','square','noise'];
const MODES=['lowpass','bandpass','highpass'];
const ASSIGNMENTS=['mono','legato','duo','poly'];
const LFO_WAVES=['sine','triangle','sawtooth','square','sample-hold'];
const TARGETS=['cutoff','resonance','volume','pulse','detune','attack','decay','sustain','release','pwmDepth','pwmRate'];
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
export function defaultPresetSettings(){
 return {
  sound:{
   model:6581,
   voice:{
    enabled:true,wave:'square',attack:.002,decay:.12,sustain:.8,release:.12,pulse:50,pwmDepth:0,pwmRate:1,
    pitchEnvelope:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE)
   },
   instrument:{voiceCount:1,unisonCount:1,mode:'mono',detune:12},
   filter:{cutoff:7000,resonance:10,volume:55,mode:'lowpass'},
   lfos:Array.from({length:3},(_,i)=>({enabled:false,sync:false,wave:'sine',rate:1,syncDivision:4,depth:0,target:'cutoff',phase:0,seed:i}))
  },
  performance:{
   masterBpm:120,
   arp:{enabled:false,latch:false,pattern:'up',rate:4,sync:true,localBpm:120},
   game:{enabled:true,style:'action',rate:4,sequence:defaultSequence()}
  }
 };
}
export function attachDefaultPitchEnvelope(voice){
 const source=object(voice,'voice');
 if(source.pitchEnvelope===undefined)return {...source,pitchEnvelope:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE)};
 return source;
}
export function validatePresetSettings(value){
 const root=object(value,'settings'),sound=object(root.sound,'sound');
 const v=attachDefaultPitchEnvelope(sound.voice);
 const ins=object(sound.instrument,'instrument'),filter=object(sound.filter,'filter');
 if(!Array.isArray(sound.lfos)||sound.lfos.length!==3)throw new RangeError('Exactly three LFOs are required');
 const perf=object(root.performance,'performance');
 const arp=object(perf.arp,'arpeggiator'),game=object(perf.game,'Game Arp');
 return {
  sound:{
   model:choice(sound.model,'chip model',[6581,8580]),
   voice:{
    enabled:boolean(v.enabled,'enabled'),wave:choice(v.wave,'waveform',WAVES),
    attack:numeric(v.attack,'attack',0,2),decay:numeric(v.decay,'decay',0,3),
    sustain:numeric(v.sustain,'sustain',0,1),release:numeric(v.release,'release',.01,4),
    pulse:numeric(v.pulse,'pulse width',5,95),pwmDepth:numeric(v.pwmDepth,'PWM depth',0,45),
    pwmRate:numeric(v.pwmRate,'PWM rate',.1,12),
    pitchEnvelope:validatePitchEnvelope(v.pitchEnvelope)
   },
   instrument:{
    voiceCount:integer(ins.voiceCount,'voice count',1,8),
    unisonCount:integer(ins.unisonCount,'unison layers',1,integer(ins.voiceCount,'voice count',1,8)),
    mode:choice(ins.mode,'voice assignment',ASSIGNMENTS),
    detune:numeric(ins.detune,'detune',0,100)
   },
   filter:{
    cutoff:numeric(filter.cutoff,'cutoff',50,10000),
    resonance:numeric(filter.resonance,'resonance',0,100),
    volume:numeric(filter.volume,'volume',0,100),mode:choice(filter.mode,'filter mode',MODES)
   },
   lfos:sound.lfos.map((lfo,i)=>{
    object(lfo,'LFO '+(i+1));
    return {
     enabled:boolean(lfo.enabled,'LFO enabled'),sync:boolean(lfo.sync,'LFO sync'),
     wave:choice(lfo.wave,'LFO waveform',LFO_WAVES),
     rate:numeric(lfo.rate,'LFO rate',.05,20),syncDivision:choice(lfo.syncDivision,'LFO division',DIVISIONS),
     depth:numeric(lfo.depth,'LFO depth',0,1),target:choice(lfo.target,'LFO target',TARGETS),
     phase:numeric(lfo.phase,'LFO phase',-1e6,1e6),seed:numeric(lfo.seed,'LFO seed',-1e6,1e6)
    };
   })
  },
  performance:{
   masterBpm:integer(perf.masterBpm,'master BPM',40,240),
   arp:{
    enabled:boolean(arp.enabled,'Arp enabled'),latch:boolean(arp.latch,'Arp latch'),
    pattern:choice(arp.pattern,'Arp pattern',PATTERNS),rate:choice(arp.rate,'Arp rate',DIVISIONS),
    sync:boolean(arp.sync,'Arp sync'),localBpm:integer(arp.localBpm,'local BPM',40,240)
   },
   game:{enabled:boolean(game.enabled,'Game Arp enabled'),style:choice(game.style,'Game Arp style',STYLES),
    rate:choice(game.rate,'Game Arp pattern rate',DIVISIONS),
    sequence:validateSequence(game.sequence??defaultSequence())}
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
export function validatePreset(value,{requireId=false}={}){
 const p=object(value,'preset');
 const out={name:cleanPresetName(p.name),settings:validatePresetSettings(p.settings)};
 if(requireId){
  if(typeof p.id!=='string'||!p.id||p.id.length>128)throw new TypeError('Invalid preset ID');
  out.id=p.id;
 }
 return out;
}
function factory(id,name,category,patch={}){
 const settings=defaultPresetSettings();
 if(patch.voice)Object.assign(settings.sound.voice,patch.voice);
 if(patch.instrument){
  Object.assign(settings.sound.instrument,patch.instrument);
  // Existing factory sound design stacked all its selected oscillators.
  if(patch.instrument.voiceCount&&!('unisonCount' in patch.instrument))
   settings.sound.instrument.unisonCount=settings.sound.instrument.voiceCount;
 }
 if(patch.filter)Object.assign(settings.sound.filter,patch.filter);
 if(patch.model)settings.sound.model=patch.model;
 if(patch.lfos)patch.lfos.forEach((lfo,i)=>Object.assign(settings.sound.lfos[i],lfo));
 if(patch.performance){
  if(patch.performance.masterBpm)settings.performance.masterBpm=patch.performance.masterBpm;
  if(patch.performance.arp)Object.assign(settings.performance.arp,patch.performance.arp);
  if(patch.performance.game)Object.assign(settings.performance.game,patch.performance.game);
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
 factory('deep-bass','Deep Bass','Bass',{voice:{wave:'square',decay:.24,sustain:.72,pulse:32},instrument:{voiceCount:2,detune:7},filter:{cutoff:1700,resonance:8,volume:80}}),
 factory('arcade-lead','Arcade Lead','Lead',{voice:{wave:'sawtooth',decay:.1,release:.14},instrument:{voiceCount:2,detune:11},filter:{cutoff:6800,resonance:16,volume:65},performance:{game:{enabled:true,style:'arcade'}}}),
 factory('chiptune-pluck','Chiptune Pluck','Pluck',{voice:{wave:'triangle',decay:.08,sustain:0,release:.08},instrument:{detune:0},filter:{cutoff:8000,resonance:0,volume:75},performance:{game:{enabled:false}}}),
 factory('pulsing-pad','Pulsing Pad','Pad',{voice:{attack:.5,decay:.42,sustain:.65,release:1.2,pwmDepth:28,pwmRate:.7},instrument:{voiceCount:3,detune:16},filter:{cutoff:5000,resonance:20,volume:70},performance:{game:{enabled:false}}}),
 factory('soft-flute','Soft Flute','Lead',{voice:{wave:'triangle',attack:.08,decay:.24,sustain:.86,release:.35},instrument:{detune:0},filter:{cutoff:4300,resonance:5,volume:80},performance:{game:{enabled:false}}}),
 factory('filter-motion','Filter Motion','FX',{filter:{cutoff:4200,resonance:55,volume:60},lfos:[{enabled:true,wave:'triangle',rate:.35,depth:.55,target:'cutoff'}],performance:{game:{enabled:false}}}),
 // Original C64-inspired prototypes. These are sound-design starting points, not transcriptions.
 factory('tight-pulse-bass','Tight Pulse Bass','Bass',{voice:{wave:'square',attack:.002,decay:.11,sustain:.34,release:.07,pulse:27},filter:{cutoff:1350,resonance:18,volume:72},performance:{game:{enabled:false}}}),
 factory('shimmer-pwm-keys','Shimmer PWM Keys','Keys',{voice:{wave:'square',attack:.04,decay:.4,sustain:.62,release:.65,pulse:43,pwmDepth:14,pwmRate:.55},filter:{cutoff:4900,resonance:12,volume:57},performance:{game:{enabled:false}}}),
 factory('bright-pulse-lead','Bright Pulse Lead','Leads',{voice:{wave:'square',attack:.002,decay:.13,sustain:.83,release:.12,pulse:18},filter:{cutoff:7200,resonance:9,volume:64},lfos:[{enabled:true,wave:'sine',rate:5,depth:.08,target:'pulse'}],performance:{game:{enabled:false}}}),
 factory('noise-snare','Noise Snare','Drums',{voice:{wave:'noise',attack:0,decay:.13,sustain:0,release:.04},filter:{cutoff:5500,resonance:8,volume:67,mode:'highpass'},performance:{game:{enabled:false}}}),
 // Five additional original sounds in each category; retains the four approved prototypes.
 // Bass: contrasting PWM, filter, tone and octave-arpeggio behaviors.
 factory('pwm-drive-bass','PWM Drive Bass','Bass',{voice:{wave:'square',attack:.002,decay:.2,sustain:.56,release:.1,pulse:34,pwmDepth:19,pwmRate:1.1},filter:{cutoff:1850,resonance:20,volume:70},performance:{game:{enabled:false}}}),
 factory('filtered-saw-bass','Filtered Saw Bass','Bass',{voice:{wave:'sawtooth',attack:.002,decay:.18,sustain:.43,release:.12},filter:{cutoff:950,resonance:38,volume:74},performance:{game:{enabled:false}}}),
 factory('hollow-square-bass','Hollow Square Bass','Bass',{voice:{wave:'square',attack:.006,decay:.24,sustain:.66,release:.16,pulse:50},filter:{cutoff:1750,resonance:29,volume:75,mode:'bandpass'},performance:{game:{enabled:false}}}),
 factory('octave-runner-bass','Octave Runner Bass','Bass',{voice:{wave:'square',attack:.002,decay:.08,sustain:.52,release:.05,pulse:24},filter:{cutoff:2700,resonance:12,volume:67},performance:{game:{enabled:true,style:'custom',rate:8,sequence:octaveSequence([0,12,0,12])}}}),
 factory('warm-triangle-bass','Warm Triangle Bass','Bass',{voice:{wave:'triangle',attack:.015,decay:.24,sustain:.79,release:.22},filter:{cutoff:2400,resonance:7,volume:86},performance:{game:{enabled:false}}}),
 // Keys: monophonic plucks and bells alongside genuinely playable Poly patches.
 factory('chip-pluck-keys','Chip Pluck Keys','Keys',{voice:{wave:'triangle',attack:0,decay:.1,sustain:0,release:.06},filter:{cutoff:6700,resonance:4,volume:79},performance:{game:{enabled:false}}}),
 factory('bell-keys','Bell Keys','Keys',{voice:{wave:'triangle',attack:0,decay:1.1,sustain:0,release:.48},filter:{cutoff:8200,resonance:0,volume:79},performance:{game:{enabled:false}}}),
 factory('chord-stab-keys','Chord Stab Keys','Keys',{voice:{wave:'sawtooth',attack:.003,decay:.28,sustain:.35,release:.19},instrument:{voiceCount:6,unisonCount:2,mode:'poly',detune:8},filter:{cutoff:3850,resonance:21,volume:53},performance:{game:{enabled:false}}}),
 factory('organ-keys','Organ Keys','Keys',{voice:{wave:'square',attack:.012,decay:.08,sustain:1,release:.13,pulse:49},instrument:{voiceCount:4,unisonCount:1,mode:'poly',detune:0},filter:{cutoff:5700,resonance:6,volume:53},performance:{game:{enabled:false}}}),
 factory('slow-glass-pad','Slow Glass Pad','Keys',{voice:{wave:'square',attack:.68,decay:.56,sustain:.62,release:1.65,pulse:44,pwmDepth:21,pwmRate:.38},instrument:{voiceCount:4,unisonCount:1,mode:'poly',detune:0},filter:{cutoff:4200,resonance:14,volume:56},lfos:[{enabled:true,wave:'sine',rate:.22,depth:.18,target:'cutoff'}],performance:{game:{enabled:false}}}),
 // Leads: legato, resonant pulse, volume tremolo, octave stepping, and filtered saw.
 factory('nasal-pwm-lead','Nasal PWM Lead','Leads',{voice:{wave:'square',attack:.002,decay:.16,sustain:.82,release:.16,pulse:16,pwmDepth:13,pwmRate:1.35},filter:{cutoff:2650,resonance:39,volume:63,mode:'bandpass'},performance:{game:{enabled:false}}}),
 factory('smooth-legato-lead','Smooth Legato Lead','Leads',{voice:{wave:'triangle',attack:.035,decay:.28,sustain:.88,release:.32},instrument:{voiceCount:1,unisonCount:1,mode:'legato',detune:0},filter:{cutoff:5600,resonance:4,volume:78},performance:{game:{enabled:false}}}),
 factory('tremolo-pulse-lead','Tremolo Pulse Lead','Leads',{voice:{wave:'square',attack:.008,decay:.21,sustain:.78,release:.22,pulse:37},filter:{cutoff:6100,resonance:12,volume:66},lfos:[{enabled:true,wave:'triangle',rate:5,depth:.35,target:'volume'}],performance:{game:{enabled:false}}}),
 factory('octave-chase-lead','Octave Chase Lead','Leads',{voice:{wave:'square',attack:.002,decay:.08,sustain:.72,release:.09,pulse:23},filter:{cutoff:6000,resonance:13,volume:62},performance:{game:{enabled:true,style:'custom',rate:8,sequence:octaveSequence([0,12,7,12])}}}),
 factory('filtered-saw-lead','Filtered Saw Lead','Leads',{voice:{wave:'sawtooth',attack:.004,decay:.22,sustain:.71,release:.21},filter:{cutoff:2900,resonance:42,volume:58},lfos:[{enabled:true,wave:'sine',rate:.8,depth:.23,target:'cutoff'}],performance:{game:{enabled:false}}}),
 // Drums: pitched and noise-envelope approximations. No pitch envelope is claimed.
 factory('low-thud-kick','Low Thud Kick','Drums',{voice:{wave:'triangle',attack:0,decay:.22,sustain:0,release:.04},filter:{cutoff:620,resonance:9,volume:90},performance:{game:{enabled:false}}}),
 factory('closed-noise-hat','Closed Noise Hat','Drums',{voice:{wave:'noise',attack:0,decay:.035,sustain:0,release:.01},filter:{cutoff:7400,resonance:6,volume:58,mode:'highpass'},performance:{game:{enabled:false}}}),
 factory('open-noise-hat','Open Noise Hat','Drums',{voice:{wave:'noise',attack:0,decay:.39,sustain:0,release:.12},filter:{cutoff:8200,resonance:8,volume:57,mode:'highpass'},performance:{game:{enabled:false}}}),
 factory('noise-clap','Noise Clap','Drums',{voice:{wave:'noise',attack:0,decay:.17,sustain:0,release:.07},filter:{cutoff:3150,resonance:28,volume:66,mode:'bandpass'},lfos:[{enabled:true,wave:'square',rate:17,depth:.49,target:'volume'}],performance:{game:{enabled:false}}}),
 factory('low-tom','Low Tom','Drums',{voice:{wave:'triangle',attack:0,decay:.31,sustain:0,release:.09},filter:{cutoff:1300,resonance:19,volume:83},performance:{game:{enabled:false}}})
]);
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
  throw new RangeError('Unsupported preset version. Import v3 or v4 JSON only; older formats are not supported.');
 const rawPresets=file.type==='project6581-preset'?[file.preset]
  :file.type==='project6581-preset-bank'&&Array.isArray(file.presets)?file.presets:null;
 const presets=rawPresets?rawPresets.map(normalizeImportedPreset):null;
 if(!presets||presets.length>MAX_USER_PRESETS)throw new TypeError('Not a Project6581 preset file');
 const names=new Set();
 for(const p of presets){const n=p.name.toLowerCase();if(names.has(n))throw new RangeError('Duplicate name in imported bank');names.add(n)}
 return presets;
}
