import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');

test('filter controls listen on range inputs only (not bubbling label duplicates)',()=>{
 assert.match(ui,/querySelectorAll\('input\[data-filter\]'\)/);
 assert.doesNotMatch(ui,/row\.dataset\.filter=/);
 assert.match(ui,/querySelectorAll\('select\[data-filter\]'\)/);
});

test('modulated sliders resolve filter inputs without matching labels',()=>{
 const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 assert.match(studio,/input\[data-filter="/);
});