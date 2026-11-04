import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
const targetNames=['volume','cutoff','resonance','detune','attack','decay','sustain','release','pulse','pwmDepth','pwmRate'];

test('the module script remains valid JavaScript with the track presentation helper',()=>{
 assert.ok(script);
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(script,/import \{modulationTrack,formatControlValue,SLIDER_TARGETS\} from/);
});

test('eleven continuous sound controls have numeric base values that remain visible',()=>{
 assert.match(html,/id="detune"[^>]*><output id="detuneValue" class="base-value"/);
 for(const name of ['volume','cutoff','resonance']){
  assert.match(html,new RegExp('id="'+name+'"[^>]*><output class="base-value">'));
 }
 assert.match(script,/ranges\.map\(\(\[p,name,min,max,step\]\)=>[\s\S]*?class="base-value"/);
 assert.match(script,/if\(baseDisplay\.textContent!==baseText\)baseDisplay\.textContent=baseText/);
 assert.deepEqual(new Set(targetNames).size,11);
});

test('modulation colors the track, not an extra moving thumb or the slider value',()=>{
 assert.match(html,/\.modulation-band\{/);
 assert.match(html,/\.slider-stack::before\{/);
 assert.match(html,/::-webkit-slider-thumb\{/);
 assert.match(html,/::-moz-range-thumb\{/);
 assert.doesNotMatch(html,/modulation-thumb/);
 assert.match(script,/setModulationTrack\(input,base\[target\],values\[target\],targetEnabled\)/);
 assert.doesNotMatch(script,/input\.value\s*=\s*values\[target\]/);
 assert.match(script,/band\.setAttribute\('aria-hidden','true'\)/);
 assert.match(script,/band\.hidden=!track\.active/);
});

test('base and effective readouts are both retained when a target is modulated',()=>{
 assert.match(script,/label\.querySelector\('output:not\(\.modulated-value\)'\)/);
 assert.match(script,/label\.querySelector\('\.modulated-value'\)/);
 assert.match(script,/display\.hidden=!targetEnabled/);
 assert.match(script,/formatControlValue\(target,effectiveValue\)/);
 assert.match(script,/SLIDER_TARGETS/);
});
