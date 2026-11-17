import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('generator LED module toggles checkboxes instead of scrolling Play panel',()=>{
 const src=readFileSync(new URL('../src/generator-led-ui.js',import.meta.url),'utf8');
 assert.match(src,/CONTROL_BY_GEN/);
 assert.match(src,/toggleGen/);
 assert.match(src,/dispatchEvent\(new Event\('change'/);
 assert.doesNotMatch(src,/focusPlaySection/);
});