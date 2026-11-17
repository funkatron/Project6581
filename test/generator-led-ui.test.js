import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('keyboard heading mounts generator LED host',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 assert.match(html,/id="generatorLeds"/);
 assert.match(studio,/mountGeneratorLeds\(/);
 assert.match(studio,/createPerformanceArpState/);
 assert.match(studio,/onGeneratorToggle:.*refreshPresetDirty/);
});