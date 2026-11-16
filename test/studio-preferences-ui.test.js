import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const prefs=readFileSync(new URL('../src/studio-preferences-ui.js',import.meta.url),'utf8');

test('system preferences dialog mounts from studio',()=>{
 assert.match(studio,/import \{mountPreferencesDialog\}/);
 assert.match(studio,/mountPreferencesDialog\(\$\)/);
 assert.match(prefs,/dialog\.showModal\(\)/);
});