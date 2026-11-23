import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panels=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('engine panels render melodic cards on SYNTH and SID 4 bus hosts on DRUM SEQ',()=>{
 assert.match(panels,/for\(let index=0;index<DRUM_ENGINE_INDEX;index\+\+\)/);
 assert.match(panels,/drum-bus-sid-engine/);
 assert.match(panels,/renderDrumBusPanels/);
 assert.match(panels,/isDrumChip/);
 assert.match(html,/id="drumBusMeters"/);
 assert.doesNotMatch(panels,/sidEngineAdd|engine\.enabled|sid-engine-remove/);
});

test('SID 4 drum card exposes stereo meter and shared bus filter controls',()=>{
 assert.match(panels,/renderStereoChipMeter/);
 assert.match(panels,/sid-stereo-meter/);
 assert.match(panels,/Bus filter/);
 assert.doesNotMatch(panels,/if\(!isDrumChip\)card\.querySelectorAll\('input\[data-filter\]'\)/);
});

test('note routing labels distinguish shared pool and per-SID layer',()=>{
 assert.match(html,/All \(shared voices\)/);
 assert.match(html,/Layer \(per SID\)/);
 assert.doesNotMatch(html,/sidEngineAdd/);
});