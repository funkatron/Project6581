import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');

test('instrument allocation uses performanceInstrument slice',()=>{
 assert.match(script,/createPerformanceInstrumentState/);
 assert.match(script,/instrument:performanceInstrument\.getState\(\)/);
 assert.match(script,/performanceInstrument\.applyFromPreset/);
 assert.doesNotMatch(script,/\$\('voiceCount'\)\.value=String/);
});