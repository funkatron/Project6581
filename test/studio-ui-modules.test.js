import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');

for(const [file,exportName] of [
 ['../src/editor-tabs.js','mountEditorTabs'],
 ['../src/lfo-panel-ui.js','mountLfoPanel'],
 ['../src/voice-sound-panel.js','mountVoiceSoundPanel'],
 ['../src/audio-timing-panel.js','mountAudioTimingPanel'],
 ['../src/studio-bootstrap.js','bootSidStudio'],
]){
 test(file+' exports '+exportName,()=>{
  const code=readFileSync(new URL(file,import.meta.url),'utf8');
  assert.match(code,new RegExp('export function '+exportName));
 });
}
test('sid-studio wires extracted UI modules',()=>{
 assert.match(studio,/from "\.\/editor-tabs\.js/);
 assert.match(studio,/mountEditorTabs\(/);
 assert.match(studio,/from "\.\/lfo-panel-ui\.js/);
 assert.match(studio,/mountLfoPanel\(/);
 assert.match(studio,/from "\.\/voice-sound-panel\.js/);
 assert.match(studio,/mountVoiceSoundPanel\(/);
 assert.match(studio,/from "\.\/audio-timing-panel\.js/);
 assert.match(studio,/mountAudioTimingPanel\(/);
});