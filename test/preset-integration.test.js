import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {readStudioCss} from './studio-css.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const studioCss=readStudioCss();
const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const library=readFileSync(new URL('../src/preset-library-ui.js',import.meta.url),'utf8');

test('preset UI compiles without changing SID native code',()=>{
 assert.ok(script,'inline app module exists');
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(script,/import \{mountPresetLibrary\} from "\.\/preset-library-ui\.js\?v=__BUILD_ID__";/);
 assert.match(library,/import \{FACTORY_PRESETS,FACTORY_GROUPS,factoryGroup,PRESET_VERSION,cleanPresetName/);
});
test('preset editor provides factory/user collections, save, export, import and backup',()=>{
 for(const id of ['presetOpen','presetCurrent','presetDialog','presetClose','factoryPresetList','userPresetList',
  'presetSave','presetSaveAs','presetRename','presetDelete',
  'presetExport','presetExportBank','presetImport','presetFile','presetExportLink'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/Factory presets/);
 assert.match(html,/My presets/);
 assert.doesNotMatch(html,/id="presetPicker"/);
 assert.match(html,/<dialog id="presetDialog" aria-labelledby="presetDialogTitle"/);
 assert.match(studioCss,/\.preset-columns\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(studioCss,/@media\(max-width:560px\)\{\.preset-columns\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(library,/\$\('presetDialog'\)\.showModal\(\)/);
 assert.match(library,/loadSelectedPreset\(button\.dataset\.kind,button\.dataset\.id\)/);
 assert.match(library,/button\.setAttribute\('aria-current',String\(selected===kind\+':'\+preset\.id\)\)/);
 assert.match(library,/writeUserPresets\(window\.localStorage,next\)/);
 assert.match(library,/importPresetFile\(await file\.text\(\)\)/);
 assert.match(library,/window\.confirm\('Replace '/);
});
test('preset loading restores performance settings without stored notes or autoplay',()=>{
 assert.match(script,/masterBpm:Number\(\$\('masterBpm'\)\.value\)/);
 for(const id of ['voiceAssign','voiceCount','unisonCount','detune','voiceCapacity'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/id="unisonOn"/);
 assert.match(script,/game:\{enabled:performanceArp\.gameOn,style:[\s\S]*?rate:Number\(\$\('gameRate'\)\.value\)/);
 assert.match(script,/arp:\{enabled:performanceArp\.rootOn,latch:performanceArp\.latchOn/);
 assert.match(script,/routing:performanceRouting\.getState\(\)/);
 assert.match(script,/performanceRouting\.applyFromPreset/);
 assert.match(script,/presetLoadRequiresSilence/);
 assert.match(script,/if\(silenceAudio\)panic\(\);\s*resetPerformanceGenerators\(\)/);
 assert.match(script,/await sidAudio\.setChipModel\(chip,engines\[chip\]\.model\)/);
 assert.match(script,/game\.step=0;arp\.root=null/);
 assert.match(script,/instrument:performanceInstrument\.getState\(\)/);
 assert.match(script,/performanceInstrument\.applyFromPreset/);
 assert.match(script,/\$\('gameRate'\)\.value=String\(next\.performance\.game\.rate\)/);
 assert.match(script,/enginePanelsUi\?\.render\(\);renderLfos\(\);updateUnison\(\);updateModulation\(\)/);
 assert.match(script,/await ensureSidModel\(presetModel\)/);
 assert.match(script,/const presetModel=next\.sound\.engines\[0\]\.model/);
 assert.match(script,/if\(pendingSidStartup\)await pendingSidStartup/);
 assert.match(script,/activeSidModel=requestedModel/);
 assert.match(script,/await ensureSidModel\(previous\.sound\.engines\[0\]\.model\)/);
 assert.match(script,/setPresetLoading\(true\)/);
 assert.match(library,/\$\('presetDialog'\)\.close\(\)/);
 assert.match(library,/if\(presetDirty&&!window\.confirm\('Discard unsaved changes to this preset\?'\)\)return/);
 assert.match(library,/presetDirty=Boolean\(selected\)&&JSON\.stringify\(snapshotPresetSettings\(\)\)/);
});

test('preset actions cannot mutate settings while loading a different sound or importing files',()=>{
 assert.match(script,/function setPresetLoading\(busy\)\{/);
 assert.match(script,/presetLoading=busy/);
 assert.match(script,/for\(const \[id,available\] of \[/);
 assert.match(script,/for\(const id of \['factoryPresetList','userPresetList'\]\)/);
 assert.match(library,/if\(isLoading\(\)\)return null/);
 assert.match(library,/setPresetLoading\(true\);\s*try\{\s*const outcome=await applyPresetSettings\(preset\.settings\)/);
 assert.match(library,/finally\{\s*setPresetLoading\(false\)/);
 assert.match(library,/if\(isLoading\(\)\)\{input\.value='';return\}/);
 assert.match(library,/finally\{input\.value='';setPresetLoading\(false\)\}/);
});
test('modal text overrides light-theme global heading and description colors',()=>{
 assert.match(studioCss,/#presetDialog h2,#presetDialog h3\{color:#f3f5fa\}/);
 assert.match(studioCss,/#preferencesDialog h2,#preferencesDialog h3\{color:#f3f5fa\}/);
 assert.match(studioCss,/#presetDialog small,#presetDialog \.preset-empty,#presetDialog \.preset-item-category\{color:#c8d6e5\}/);
});


test('chip selection switches the live engine and restores the previous model on failure',async()=>{
 let change;
 const chip={value:'8580',addEventListener(type,listener){assert.equal(type,'change');change=listener}};
 const status={textContent:''};
 const calls=[];
 const loading=[];
 const app={
  $:id=>id==='chip'?chip:status,
  activeSidModel:6581,presetLoading:false,sidRecorder:null,recordBusy:false,
  setPresetLoading:busy=>loading.push(busy),
  panic(){},arp:{held:new Set(),latched:new Set()},keys:new Map(),
  seqPreview:false,setSeqTransportLabel(){},refreshPresetDirty(){},
  async ensureSidModel(model){calls.push(model);app.activeSidModel=model}
 };
 const handler=script.match(/\$\('chip'\)\.addEventListener\('change',[\s\S]*?^\}\);/m)?.[0];
 assert.ok(handler);
 runInNewContext(handler,app);
 await change({currentTarget:chip});
 assert.equal(app.activeSidModel,8580);
 assert.deepEqual(calls,[8580]);
 assert.deepEqual(loading,[true,false]);

 chip.value='6581';
 app.ensureSidModel=async model=>{
  calls.push(model);
  if(model===6581)throw new Error('test failure');
 };
 await change({currentTarget:chip});
 assert.equal(chip.value,'8580');
 assert.deepEqual(calls,[8580,6581,8580]);
 assert.match(status.textContent,/Could not switch to SID 6581: test failure/);

 app.sidRecorder={recording:true};
 chip.value='6581';
 await change({currentTarget:chip});
 assert.equal(chip.value,'8580');
 assert.deepEqual(calls,[8580,6581,8580]);
});


test('empty live Arp selections snapshot as Up and Action so presets can still load',()=>{
 const source=script.slice(script.indexOf('function snapshotPresetSettings()'),script.indexOf('function applyPresetControls('));
 const engines=[{model:6581,pan:0,voice:{enabled:true},filter:{}},{model:6581,pan:0,voice:{enabled:true},filter:{}},{model:6581,pan:0,voice:{enabled:true},filter:{}}];
 const app={
  $:id=>({value:['arpPattern','gameArpStyle'].includes(id)?'':'1',checked:false}),
  validatePresetSettings:value=>value,engines,lfoState:[],seqState:{},
  readRoutingFromDom:()=>({keyboard:'all',arp:'all',game:'sid1'}),
  performanceArp:{rootOn:false,latchOn:false,gameOn:false},
  performanceRouting:{getState:()=>({keyboard:'all',arp:'all',game:'sid1'})},
  performanceInstrument:{getState:()=>({voiceCount:1,unisonCount:1,mode:'mono',detune:12})},
  readScaleStateFromDom:()=>({tonic:0,id:'chromatic',lock:false})
 };
 const {arp,game}=runInNewContext(source+'snapshotPresetSettings()',app).performance;
 assert.equal(arp.pattern,'up');
 assert.equal(game.style,'action');
 app.$=id=>({value:id==='arpPattern'?'random':'1',checked:false});
 assert.equal(runInNewContext(source+'snapshotPresetSettings()',app).performance.arp.pattern,'random');
});

test('factory preset browser groups the expanded bank without changing the user collection',()=>{
 assert.match(library,/FACTORY_PRESETS,FACTORY_GROUPS,factoryGroup,PRESET_VERSION/);
 assert.match(library,/kind==='factory'\s*\?\[\.\.\.presets\]\.sort/);
 assert.match(library,/factoryGroup\(preset\.category\)/);
 assert.match(library,/heading\.className='preset-category-heading'/);
 assert.match(library,/heading\.setAttribute\('role','heading'\)/);
 assert.match(library,/button\.dataset\.kind=kind;button\.dataset\.id=preset\.id/);
 assert.match(library,/button\.setAttribute\('aria-current',String\(selected===kind\+':'\+preset\.id\)\)/);
 assert.match(studioCss,/\.preset-category-heading\{position:sticky/);
 assert.match(library,/\['factory',FACTORY_PRESETS,'factoryPresetList'\],\['user',userPresets,'userPresetList'\]/);
});
