import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('header uses compact BPM chip and icon record/stop buttons',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/seq-ui.css',import.meta.url),'utf8');
 assert.match(html,/master-bpm-chip/);
 assert.match(html,/header-icon-btn/);
 assert.match(html,/aria-label="Record"/);
 assert.match(html,/aria-label="Stop all notes"/);
 assert.match(css,/\.master-bpm-chip\{/);
 assert.match(css,/var\(--bar-h/);
});