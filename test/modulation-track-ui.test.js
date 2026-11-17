import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

import {readStudioCss} from './studio-css.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const enginePanels=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
const studioCss=readStudioCss();
import {LFO_TARGET_ORDER} from '../src/lfo-modulation.js';
const targetNames=LFO_TARGET_ORDER;

test('the module script remains valid JavaScript with the track presentation helper',()=>{
 assert.ok(script);
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(script,/import \{modulationTrack,formatControlValue,SLIDER_TARGETS\} from/);
});

test('twelve continuous sound controls have numeric base values that remain visible',()=>{
 assert.match(html,/id="detune"[\s\S]*?<output id="detuneValue" class="base-value"/);
 assert.match(enginePanels,/for\(const \[prop,name,min,max,step\] of ranges\)/);
 assert.match(enginePanels,/appendParamRow\(voiceParams,name/);
 assert.match(enginePanels,/input\.dataset\.filter=filter/);
 assert.match(script,/if\(baseDisplay\.textContent!==baseText\)baseDisplay\.textContent=baseText/);
 assert.deepEqual(new Set(targetNames).size,12);
});

test('modulation colors the track, not an extra moving thumb or the slider value',()=>{
 assert.match(studioCss,/\.modulation-band\{/);
 assert.match(studioCss,/\.slider-stack::before\{/);
 assert.match(studioCss,/::-webkit-slider-thumb\{/);
 assert.match(studioCss,/::-moz-range-thumb\{/);
 assert.doesNotMatch(html,/modulation-thumb/);
 assert.match(script,/setModulationTrack\(input,baseValue,effectiveValue,enabled\)/);
 assert.match(script,/const effective=target==='pulse'\?livePulse:values\[target\]/);
 assert.doesNotMatch(script,/input\.value\s*=\s*values\[target\]/);
 assert.match(script,/band\.setAttribute\('aria-hidden','true'\)/);
 assert.match(script,/band\.hidden=!track\.active/);
});

test('base and effective readouts are both retained when a target is modulated',()=>{
 assert.match(script,/function presentModulatedSlider/);
 assert.match(script,/closest\('\.param-row'\)/);
 assert.match(script,/container\.querySelector\('output:not\(\.modulated-value\)'\)/);
 assert.match(script,/display\.hidden=!enabled/);
 assert.match(script,/formatControlValue\(target,effectiveValue\)/);
 assert.match(script,/lfosForEngine\(effectiveLfos,chip\)/);
 assert.match(script,/SLIDER_TARGETS/);
});

test('envelope and detune targets refresh on a UI loop without repushing audio config',()=>{
 assert.match(script,/function syncModulationUiLoop/);
 assert.match(script,/updateModulation\(\{uiOnly:true\}\)/);
 assert.match(script,/if\(uiOnly\)return/);
});
