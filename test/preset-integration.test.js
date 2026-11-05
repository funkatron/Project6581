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
 for(const id of ['presetPicker','presetSave','presetSaveAs','presetRename','presetDelete',
  'presetExport','presetExportBank','presetImport','presetFile','presetExportLink'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(script,/Factory presets/);
 assert.match(script,/My presets/);
 assert.match(script,/writeUserPresets\(window\.localStorage,next\)/);
 assert.match(script,/importPresetFile\(await file\.text\(\)\)/);
 assert.match(script,/window\.confirm\('Replace '/);
});
test('preset loading restores performance settings without stored notes or autoplay',()=>{
 assert.match(script,/masterBpm:Number\(\$\('masterBpm'\)\.value\)/);
 assert.match(script,/game:\{enabled:\$\('gameArpOn'\)\.checked,style:[\s\S]*?rate:Number\(\$\('gameRate'\)\.value\)/);
 assert.match(script,/arp:\{enabled:\$\('arpOn'\)\.checked,latch:/);
 assert.match(script,/panic\(\);arp\.held\.clear\(\);arp\.latched\.clear\(\)/);
 assert.match(script,/game\.step=0;arp\.root=null/);
 assert.match(script,/\$\('gameRate'\)\.value=String\(next\.performance\.game\.rate\)/);
 assert.match(script,/renderVoiceControls\(\);renderLfos\(\);updateUnison\(\);updateModulation\(\)/);
 assert.match(script,/await ensureSidModel\(next\.sound\.model\)/);
 assert.match(script,/if\(pendingSidStartup\)await pendingSidStartup/);
 assert.match(script,/activeSidModel=requestedModel/);
 assert.match(script,/await ensureSidModel\(previous\.sound\.model\)/);
 assert.match(script,/\$\('presetPicker'\)\.disabled=true/);
 assert.match(script,/presetDirty=Boolean\(selected\)&&JSON\.stringify\(snapshotPresetSettings\(\)\)/);
});
