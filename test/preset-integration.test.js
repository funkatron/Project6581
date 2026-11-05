import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

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
 assert.match(script,/presetLoading=true/);
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
