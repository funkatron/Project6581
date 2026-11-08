import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PRESET_VERSION,PRESET_STORAGE_KEY,LEGACY_PRESET_STORAGE_KEY_V3,FACTORY_PRESETS,FACTORY_GROUPS,factoryGroup,
 defaultPresetSettings,validatePresetSettings,readUserPresets,writeUserPresets,exportPreset,exportPresetBank,
 importPresetFile
} from '../src/preset-library.js';
import {DEFAULT_PITCH_ENVELOPE} from '../src/pitch-envelope.js';
import {sequenceEvent} from '../src/game-step-sequencer.js';

const makeStorage=()=>{
 const values=new Map();
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,value),
  removeItem:key=>{values.delete(key)},
  values
 };
};

test('factory bank contains useful original sounds and complete performance settings',()=>{
 assert.ok(FACTORY_PRESETS.length>=5);
 const ids=new Set(),names=new Set();
 for(const p of FACTORY_PRESETS){
  assert.ok(p.name.length);
  assert.equal(ids.has(p.id),false);
  assert.equal(names.has(p.name),false);
  ids.add(p.id);names.add(p.name);
  const result=validatePresetSettings(p.settings);
  assert.deepEqual(result,p.settings);
  assert.equal(result.sound.lfos.length,3);
  assert.equal(typeof result.performance.masterBpm,'number');
  assert.equal(typeof result.performance.arp.enabled,'boolean');
  assert.equal(typeof result.performance.game.style,'string');
 }
});
test('user preset can save and reload every sound and performance setting',()=>{
 const storage=makeStorage(),settings=defaultPresetSettings();
 settings.sound.model=8580;
 settings.sound.voice.wave='noise';
 settings.sound.voice.attack=.45;
 settings.sound.instrument.voiceCount=7;
 settings.sound.instrument.mode='poly';
 settings.sound.instrument.unisonCount=2;
 settings.sound.filter.cutoff=2300;
 settings.sound.lfos[2]={...settings.sound.lfos[2],enabled:true,wave:'sample-hold',rate:2.25,depth:.45,target:'volume'};
 settings.performance.masterBpm=147;
 settings.performance.arp={enabled:true,latch:true,pattern:'updown',rate:8,sync:false,localBpm:98};
 settings.performance.game={...settings.performance.game,enabled:true,style:'adventure',rate:8};
 const saved=writeUserPresets(storage,[{id:'abc123',name:'My 8580',settings}]);
 assert.deepEqual(readUserPresets(storage),saved);
 assert.deepEqual(saved[0].settings,settings);
 assert.equal(JSON.parse(storage.values.get(PRESET_STORAGE_KEY)).version,PRESET_VERSION);
});
test('single preset and entire bank export then import without losing LFOs or arp timing',()=>{
 const first={name:'First',settings:FACTORY_PRESETS[0].settings};
 const second={name:'Second',settings:FACTORY_PRESETS[1].settings};
 assert.deepEqual(importPresetFile(exportPreset(first)),[first]);
 assert.deepEqual(importPresetFile(exportPresetBank([first,second])),[first,second]);
});
test('invalid file, unsupported version, duplicate names and invalid slider values are rejected',()=>{
 const good={name:'Good',settings:defaultPresetSettings()};
 const bad=JSON.parse(exportPreset(good));
 bad.version=99;
 assert.throws(()=>importPresetFile(JSON.stringify(bad)),/Unsupported preset version/);
 assert.throws(()=>importPresetFile('not JSON'));
 assert.throws(()=>importPresetFile(exportPresetBank([good,{...good,name:'GOOD'}])),/Duplicate name/);
 const invalid=defaultPresetSettings();
 invalid.sound.filter.cutoff=-100;
 assert.throws(()=>validatePresetSettings(invalid),/cutoff/);
 invalid.sound.filter.cutoff=4000;
 invalid.performance.masterBpm=500;
 assert.throws(()=>validatePresetSettings(invalid),/BPM/);
 invalid.performance.masterBpm=120;
 invalid.sound.lfos[0].target='eval()';
 assert.throws(()=>validatePresetSettings(invalid),/LFO target/);
 const badLayers=defaultPresetSettings();badLayers.sound.instrument.unisonCount=4;
 assert.throws(()=>validatePresetSettings(badLayers),/unison layers/);
 badLayers.sound.instrument.unisonCount=1;badLayers.sound.instrument.mode='duophonic';
 assert.throws(()=>validatePresetSettings(badLayers),/voice assignment/);
});
test('failed local validation never destroys the existing saved bank',()=>{
 const storage=makeStorage();
 writeUserPresets(storage,[{id:'1',name:'Original',settings:defaultPresetSettings()}]);
 const initial=storage.values.get(PRESET_STORAGE_KEY);
 assert.throws(()=>writeUserPresets(storage,[
  {id:'1',name:'Original',settings:defaultPresetSettings()},
  {id:'2',name:'original',settings:defaultPresetSettings()}
 ]),/Duplicate/);
 assert.equal(storage.values.get(PRESET_STORAGE_KEY),initial);
});

test('C64-inspired prototype bank covers four distinct categories without changing preset format',()=>{
 const prototypes=[
  ['tight-pulse-bass','Bass','square'],
  ['shimmer-pwm-keys','Keys','square'],
  ['bright-pulse-lead','Leads','square'],
  ['noise-snare','Drums','noise']
 ];
 for(const [id,category,wave] of prototypes){
  const p=FACTORY_PRESETS.find(p=>p.id===id);
  assert.ok(p,'missing prototype '+id);
  assert.equal(p.category,category);
  assert.equal(p.settings.sound.voice.wave,wave);
  assert.equal(p.settings.performance.game.enabled,false);
  assert.deepEqual(importPresetFile(exportPreset(p)),[{name:p.name,settings:p.settings}]);
 }
 const legacy=['deep-bass','arcade-lead','chiptune-pluck','pulsing-pad','soft-flute','filter-motion'];
 for(const id of [...legacy,...prototypes.map(([id])=>id)])
  assert.ok(FACTORY_PRESETS.some(p=>p.id===id),'legacy or prototype factory sound removed: '+id);
 assert.equal(PRESET_VERSION,4);
 assert.equal(FACTORY_PRESETS[0].settings.sound.voice.pitchEnvelope.enabled,false);
});

test('expanded C64 factory bank retains legacy sounds and has six originals per new category',()=>{
 const newIds={
  Bass:['tight-pulse-bass','pwm-drive-bass','filtered-saw-bass','hollow-square-bass','octave-runner-bass','warm-triangle-bass'],
  Keys:['shimmer-pwm-keys','chip-pluck-keys','bell-keys','chord-stab-keys','organ-keys','slow-glass-pad'],
  Leads:['bright-pulse-lead','nasal-pwm-lead','smooth-legato-lead','tremolo-pulse-lead','octave-chase-lead','filtered-saw-lead'],
  Drums:['noise-snare','low-thud-kick','closed-noise-hat','open-noise-hat','noise-clap','low-tom']
 };
 const legacy=['deep-bass','arcade-lead','chiptune-pluck','pulsing-pad','soft-flute','filter-motion'];
 const allNew=Object.values(newIds).flat();
 assert.equal(allNew.length,24);
 assert.equal(FACTORY_PRESETS.length,30);
 assert.deepEqual(new Set(FACTORY_PRESETS.map(p=>p.id)),new Set([...legacy,...allNew]));
 assert.equal(new Set(FACTORY_PRESETS.map(p=>p.name.toLowerCase())).size,30);
 assert.deepEqual(FACTORY_GROUPS,['Bass','Keys','Leads','Drums','FX']);
 for(const [category,ids] of Object.entries(newIds)){
  assert.equal(ids.length,6);
  for(const id of ids){
   const preset=FACTORY_PRESETS.find(p=>p.id===id);
   assert.ok(preset,id+' is missing');
   assert.equal(preset.category,category);
   assert.equal(factoryGroup(preset.category),category);
   assert.deepEqual(validatePresetSettings(preset.settings),preset.settings);
   assert.deepEqual(importPresetFile(exportPreset(preset)),[{name:preset.name,settings:preset.settings}]);
   if(!['octave-runner-bass','octave-chase-lead'].includes(id))
    assert.equal(preset.settings.performance.game.enabled,false,id+' should play directly');
  }
 }
 for(const preset of FACTORY_PRESETS)
  assert.ok(FACTORY_GROUPS.includes(factoryGroup(preset.category)),preset.id+' has no browser group');
 assert.equal(PRESET_VERSION,4);
});

test('octave presets use explicit Game Arp patterns and do not change global neutral reset',()=>{
 for(const [id,expected] of [
  ['octave-runner-bass',[0,12,0,12]],
  ['octave-chase-lead',[0,12,7,12]]
 ]){
  const preset=FACTORY_PRESETS.find(p=>p.id===id);
  const game=preset.settings.performance.game;
  assert.equal(game.enabled,true);
  assert.equal(game.style,'custom');
  assert.equal(game.sequence.length,4);
  assert.deepEqual(game.sequence.steps.slice(0,4).map(s=>s.offset),expected);
  assert.deepEqual(expected.map((offset,i)=>sequenceEvent(48,game.sequence,i).note),expected.map(offset=>48+offset));
 }
 assert.deepEqual(defaultPresetSettings().performance.game.sequence.steps.map(s=>s.offset),Array(16).fill(0));
});

test('legacy factory category labels group with the expanded bank without rewriting metadata',()=>{
 assert.equal(factoryGroup('Lead'),'Leads');
 assert.equal(factoryGroup('Pluck'),'Keys');
 assert.equal(factoryGroup('Pad'),'Keys');
 assert.equal(factoryGroup('FX'),'FX');
 assert.equal(FACTORY_PRESETS.find(p=>p.id==='arcade-lead').category,'Lead');
});

test('version 3 preset files import with default disabled pitch envelope',()=>{
 const base=defaultPresetSettings();
 const voice={...base.sound.voice};
 delete voice.pitchEnvelope;
 const settings={sound:{...base.sound,voice},performance:base.performance};
 const raw=JSON.stringify({type:'project6581-preset',version:3,preset:{name:'Legacy',settings}});
 const [imported]=importPresetFile(raw);
 assert.equal(imported.settings.sound.voice.pitchEnvelope.enabled,false);
 assert.equal(JSON.parse(exportPreset(imported)).version,PRESET_VERSION);
});

test('local v3 bank migrates to v4 storage on read',()=>{
 const storage=makeStorage();
 const base=defaultPresetSettings();
 const voice={...base.sound.voice};
 delete voice.pitchEnvelope;
 storage.setItem(LEGACY_PRESET_STORAGE_KEY_V3,JSON.stringify({
  version:3,
  presets:[{id:'keep-me',name:'Keep',settings:{sound:{...base.sound,voice},performance:base.performance}}]
 }));
 const items=readUserPresets(storage);
 assert.equal(items.length,1);
 assert.equal(items[0].name,'Keep');
 assert.equal(items[0].settings.sound.voice.pitchEnvelope.enabled,false);
 assert.ok(storage.getItem(PRESET_STORAGE_KEY));
 assert.equal(storage.getItem(LEGACY_PRESET_STORAGE_KEY_V3),null);
});

test('enabled pitch envelope validates and round-trips',()=>{
 const settings=defaultPresetSettings();
 settings.sound.voice.pitchEnvelope={
  enabled:true,interpolation:'curve',end:'zero',
  points:[{ms:0,semitones:12},{ms:80,semitones:0}]
 };
 const validated=validatePresetSettings(settings);
 const [imported]=importPresetFile(exportPreset({name:'Sweep',settings:validated}));
 assert.deepEqual(imported.settings.sound.voice.pitchEnvelope,validated.sound.voice.pitchEnvelope);
});

test('invalid pitch envelope times reject preset settings',()=>{
 const settings=defaultPresetSettings();
 settings.sound.voice.pitchEnvelope={
  enabled:true,interpolation:'linear',end:'hold',
  points:[{ms:0,semitones:0},{ms:0,semitones:5}]
 };
 assert.throws(()=>validatePresetSettings(settings),/Pitch point/);
});
