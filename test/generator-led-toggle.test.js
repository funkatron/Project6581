import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('generator LED module toggles via performance arp slice',()=>{
 const src=readFileSync(new URL('../src/generator-led-ui.js',import.meta.url),'utf8');
 assert.match(src,/performanceArp\.set/);
 assert.match(src,/performanceArp\.subscribe/);
 assert.match(src,/genLedDrum/);
 assert.match(src,/performanceDrum/);
 assert.doesNotMatch(src,/focusPlaySection/);
});