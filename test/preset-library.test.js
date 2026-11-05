import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PRESET_VERSION,PRESET_STORAGE_KEY,FACTORY_PRESETS,defaultPresetSettings,
 validatePresetSettings,readUserPresets,writeUserPresets,exportPreset,exportPresetBank,importPresetFile
} from '../src/preset-library.js';

const makeStorage=()=>{
 const values=new Map();
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,value),
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
 settings.sound.instrument.unison=false;
 settings.sound.filter.cutoff=2300;
 settings.sound.lfos[2]={...settings.sound.lfos[2],enabled:true,wave:'sample-hold',rate:2.25,depth:.45,target:'volume'};
 settings.performance.masterBpm=147;
 settings.performance.arp={enabled:true,latch:true,pattern:'updown',rate:8,sync:false,localBpm:98};
 settings.performance.game={enabled:true,style:'adventure'};
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
 bad.version=2;
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
