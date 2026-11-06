import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('preset UI compiles without changing SID native code',()=>{
 assert.ok(script,'inline app module exists');
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(script,/import \{FACTORY_PRESETS,PRESET_VERSION,cleanPresetName/);
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
 assert.match(html,/\.preset-columns\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/@media\(max-width:560px\)\{\.preset-columns\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(script,/\$\('presetDialog'\)\.showModal\(\)/);
 assert.match(script,/loadSelectedPreset\(button\.dataset\.kind,button\.dataset\.id\)/);
 assert.match(script,/button\.setAttribute\('aria-current',String\(selected===kind\+':'\+preset\.id\)\)/);
 assert.match(script,/writeUserPresets\(window\.localStorage,next\)/);
 assert.match(script,/importPresetFile\(await file\.text\(\)\)/);
 assert.match(script,/window\.confirm\('Replace '/);
});
test('preset loading restores performance settings without stored notes or autoplay',()=>{
 assert.match(script,/masterBpm:Number\(\$\('masterBpm'\)\.value\)/);
 for(const id of ['voiceAssign','voiceCount','unisonCount','detune','voiceCapacity'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/id="unisonOn"/);
 assert.match(script,/game:\{enabled:\$\('gameArpOn'\)\.checked,style:[\s\S]*?rate:Number\(\$\('gameRate'\)\.value\)/);
 assert.match(script,/arp:\{enabled:\$\('arpOn'\)\.checked,latch:/);
 assert.match(script,/panic\(\);arp\.held\.clear\(\);arp\.latched\.clear\(\)/);
 assert.match(script,/game\.step=0;arp\.root=null/);
 assert.match(script,/unisonCount:Number\(\$\('unisonCount'\)\.value\)/);
 assert.match(script,/mode:\$\('voiceAssign'\)\.value/);
 assert.match(script,/\$\('unisonCount'\)\.value=String\(next\.sound\.instrument\.unisonCount\)/);
 assert.match(script,/\$\('voiceAssign'\)\.value=next\.sound\.instrument\.mode/);
 assert.match(script,/\$\('gameRate'\)\.value=String\(next\.performance\.game\.rate\)/);
 assert.match(script,/renderVoiceControls\(\);renderLfos\(\);updateUnison\(\);updateModulation\(\)/);
 assert.match(script,/await ensureSidModel\(next\.sound\.model\)/);
 assert.match(script,/if\(pendingSidStartup\)await pendingSidStartup/);
 assert.match(script,/activeSidModel=requestedModel/);
 assert.match(script,/await ensureSidModel\(previous\.sound\.model\)/);
 assert.match(script,/setPresetLoading\(true\)/);
 assert.match(script,/\$\('presetDialog'\)\.close\(\)/);
 assert.match(script,/if\(presetDirty&&!window\.confirm\('Discard unsaved changes to this preset\?'\)\)return/);
 assert.match(script,/presetDirty=Boolean\(selected\)&&JSON\.stringify\(snapshotPresetSettings\(\)\)/);
});

test('preset actions cannot mutate settings while loading a different sound or importing files',()=>{
 assert.match(script,/function setPresetLoading\(busy\)\{/);
 assert.match(script,/presetLoading=busy/);
 assert.match(script,/for\(const \[id,available\] of \[/);
 assert.match(script,/for\(const id of \['factoryPresetList','userPresetList'\]\)/);
 assert.match(script,/if\(presetLoading\)return null/);
 assert.match(script,/setPresetLoading\(true\);\s*try\{\s*await applyPresetSettings\(preset\.settings\)/);
 assert.match(script,/finally\{\s*setPresetLoading\(false\)/);
 assert.match(script,/if\(presetLoading\)\{input\.value='';return\}/);
 assert.match(script,/finally\{input\.value='';setPresetLoading\(false\)\}/);
});
test('modal text overrides light-theme global heading and description colors',()=>{
 assert.match(html,/#presetDialog h2,#presetDialog h3\{color:#f3f5fa\}/);
 assert.match(html,/#presetDialog small,#presetDialog \.preset-empty,#presetDialog \.preset-item-category\{color:#c8d6e5\}/);
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
 const source=script.slice(script.indexOf('function snapshotPresetSettings()'),script.indexOf('function currentPreset()'));
 const app={
  $:id=>({value:['arpPattern','gameArpStyle'].includes(id)?'':'1',checked:false}),
  validatePresetSettings:value=>value,settings:[{}],lfoState:[],seqState:{}
 };
 const {arp,game}=runInNewContext(source+'snapshotPresetSettings()',app).performance;
 assert.equal(arp.pattern,'up');
 assert.equal(game.style,'action');
 app.$=id=>({value:id==='arpPattern'?'random':'1',checked:false});
 assert.equal(runInNewContext(source+'snapshotPresetSettings()',app).performance.arp.pattern,'random');
});

test('factory preset browser groups the expanded bank without changing the user collection',()=>{
 assert.match(script,/FACTORY_PRESETS,FACTORY_GROUPS,factoryGroup,PRESET_VERSION/);
 assert.match(script,/kind==='factory'\s*\?\[\.\.\.presets\]\.sort/);
 assert.match(script,/factoryGroup\(preset\.category\)/);
 assert.match(script,/heading\.className='preset-category-heading'/);
 assert.match(script,/heading\.setAttribute\('role','heading'\)/);
 assert.match(script,/button\.dataset\.kind=kind;button\.dataset\.id=preset\.id/);
 assert.match(script,/button\.setAttribute\('aria-current',String\(selected===kind\+':'\+preset\.id\)\)/);
 assert.match(html,/\.preset-category-heading\{position:sticky/);
 assert.match(script,/\['factory',FACTORY_PRESETS,'factoryPresetList'\],\['user',userPresets,'userPresetList'\]/);
});
