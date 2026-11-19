import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panels=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('engine panels render melodic cards on SYNTH and SID 4 on DRUM SEQ',()=>{
 assert.match(panels,/for\(let index=0;index<SID_ENGINE_COUNT;index\+\+\)/);
 assert.match(panels,/drumSidEngine/);
 assert.match(html,/id="drumSidEngine"/);
 assert.doesNotMatch(panels,/sidEngineAdd|engine\.enabled|sid-engine-remove/);
});

test('note routing labels distinguish shared pool and per-SID layer',()=>{
 assert.match(html,/All \(shared voices\)/);
 assert.match(html,/Layer \(per SID\)/);
 assert.doesNotMatch(html,/sidEngineAdd/);
});