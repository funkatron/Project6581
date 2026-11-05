// Project6581 preset format v1: sound and performance settings.
// This is intentionally a single-version format; no migrations are needed yet.
export const PRESET_VERSION=2;
export const PRESET_STORAGE_KEY='project6581.user-presets.v2';
export const MAX_USER_PRESETS=100;
const WAVES=['triangle','sawtooth','square','noise'];
const MODES=['lowpass','bandpass','highpass'];
const LFO_WAVES=['sine','triangle','sawtooth','square','sample-hold'];
const TARGETS=['cutoff','resonance','volume','pulse','detune','attack','decay','sustain','release','pwmDepth','pwmRate'];
const DIVISIONS=[.25,.5,1,2,4,8,16,32];
const PATTERNS=['up','down','updown','random'];
const STYLES=['action','adventure','arcade'];
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
   voice:{enabled:true,wave:'square',attack:.002,decay:.12,sustain:.8,release:.12,pulse:50,pwmDepth:0,pwmRate:1},
   instrument:{voiceCount:1,unison:true,detune:12},
   filter:{cutoff:7000,resonance:10,volume:55,mode:'lowpass'},
   lfos:Array.from({length:3},(_,i)=>({enabled:false,sync:false,wave:'sine',rate:1,syncDivision:4,depth:0,target:'cutoff',phase:0,seed:i}))
  },
  performance:{
   masterBpm:120,
   arp:{enabled:false,latch:false,pattern:'up',rate:4,sync:true,localBpm:120},
   game:{enabled:true,style:'action',rate:4}
  }
 };
}
export function validatePresetSettings(value){
 const root=object(value,'settings'),sound=object(root.sound,'sound');
 const v=object(sound.voice,'voice'),ins=object(sound.instrument,'instrument'),filter=object(sound.filter,'filter');
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
    pwmRate:numeric(v.pwmRate,'PWM rate',.1,12)
   },
   instrument:{
    voiceCount:integer(ins.voiceCount,'voice count',1,8),
    unison:boolean(ins.unison,'unison'),detune:numeric(ins.detune,'detune',0,100)
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
    rate:choice(game.rate,'Game Arp pattern rate',DIVISIONS)}
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
 if(patch.instrument)Object.assign(settings.sound.instrument,patch.instrument);
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
export const FACTORY_PRESETS=Object.freeze([
 factory('deep-bass','Deep Bass','Bass',{voice:{wave:'square',decay:.24,sustain:.72,pulse:32},instrument:{voiceCount:2,detune:7},filter:{cutoff:1700,resonance:8,volume:80}}),
 factory('arcade-lead','Arcade Lead','Lead',{voice:{wave:'sawtooth',decay:.1,release:.14},instrument:{voiceCount:2,detune:11},filter:{cutoff:6800,resonance:16,volume:65},performance:{game:{enabled:true,style:'arcade'}}}),
 factory('chiptune-pluck','Chiptune Pluck','Pluck',{voice:{wave:'triangle',decay:.08,sustain:0,release:.08},instrument:{detune:0},filter:{cutoff:8000,resonance:0,volume:75},performance:{game:{enabled:false}}}),
 factory('pulsing-pad','Pulsing Pad','Pad',{voice:{attack:.5,decay:.42,sustain:.65,release:1.2,pwmDepth:28,pwmRate:.7},instrument:{voiceCount:3,detune:16},filter:{cutoff:5000,resonance:20,volume:70},performance:{game:{enabled:false}}}),
 factory('soft-flute','Soft Flute','Lead',{voice:{wave:'triangle',attack:.08,decay:.24,sustain:.86,release:.35},instrument:{detune:0},filter:{cutoff:4300,resonance:5,volume:80},performance:{game:{enabled:false}}}),
 factory('filter-motion','Filter Motion','FX',{filter:{cutoff:4200,resonance:55,volume:60},lfos:[{enabled:true,wave:'triangle',rate:.35,depth:.55,target:'cutoff'}],performance:{game:{enabled:false}}})
]);
function unique(presets){
 const names=new Set(),ids=new Set();
 for(const p of presets){
  const key=p.name.toLowerCase();
  if(names.has(key)||ids.has(p.id))throw new RangeError('Duplicate user preset: '+p.name);
  names.add(key);ids.add(p.id);
 }
}
export function readUserPresets(storage){
 const raw=storage.getItem(PRESET_STORAGE_KEY);
 if(raw===null)return [];
 const bank=object(JSON.parse(raw),'stored preset bank');
 if(bank.version!==PRESET_VERSION||!Array.isArray(bank.presets)||bank.presets.length>MAX_USER_PRESETS)
  throw new RangeError('Unsupported or oversized preset bank');
 const items=bank.presets.map(p=>validatePreset(p,{requireId:true}));
 unique(items);return items;
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
export function importPresetFile(raw){
 if(typeof raw!=='string'||raw.length>2*1024*1024)throw new RangeError('Preset file is too large');
 const file=object(JSON.parse(raw),'preset file');
 if(file.version!==PRESET_VERSION)throw new RangeError('Unsupported preset version. No older formats are supported yet.');
 const presets=file.type==='project6581-preset'?[validatePreset(file.preset)]
  :file.type==='project6581-preset-bank'&&Array.isArray(file.presets)?file.presets.map(p=>validatePreset(p)):null;
 if(!presets||presets.length>MAX_USER_PRESETS)throw new TypeError('Not a Project6581 preset file');
 const names=new Set();
 for(const p of presets){const n=p.name.toLowerCase();if(names.has(n))throw new RangeError('Duplicate name in imported bank');names.add(n)}
 return presets;
}
