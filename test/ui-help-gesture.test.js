import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('help gesture module and LED wiring exist',()=>{
 assert.match(readFileSync(new URL('../src/ui-help-gesture.js',import.meta.url),'utf8'),/export function bindHelpGesture/);
 assert.match(readFileSync(new URL('../src/generator-led-ui.js',import.meta.url),'utf8'),/bindHelpGesture/);
 assert.match(readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8'),/bindHelpGesture/);
 assert.ok(readFileSync(new URL('../src/ui-help-content.js',import.meta.url),'utf8').includes('generator-led-root'));
});