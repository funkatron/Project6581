import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTORY_PRESETS} from '../src/preset-library.js';
import {CORE_C64_INSPIRED_IDS,FACTORY_AUDITION_PHRASES,SOUNDTRACK_TAGS} from '../src/factory-audition-matrix.js';

const EXPANDED_BANK={
 Bass:['tight-pulse-bass','pwm-drive-bass','filtered-saw-bass','hollow-square-bass','octave-runner-bass','warm-triangle-bass'],
 Keys:['shimmer-pwm-keys','chip-pluck-keys','bell-keys','chord-stab-keys','organ-keys','slow-glass-pad'],
 Leads:['bright-pulse-lead','nasal-pwm-lead','smooth-legato-lead','tremolo-pulse-lead','octave-chase-lead','filtered-saw-lead'],
 Drums:['noise-snare','low-thud-kick','closed-noise-hat','open-noise-hat','noise-clap','low-tom']
};

test('audition matrix covers all 24 expanded factory sounds once',()=>{
 assert.deepEqual([...CORE_C64_INSPIRED_IDS].sort(),Object.values(EXPANDED_BANK).flat().sort());
 for(const id of CORE_C64_INSPIRED_IDS){
  const row=FACTORY_AUDITION_PHRASES[id];
  assert.ok(row.low||row.mid||row.high,id+' needs at least one audition phrase');
  assert.ok(SOUNDTRACK_TAGS.includes(row.inspiredBy),id+' inspiredBy');
  assert.ok(row.designNote.length>8,id+' designNote');
  const preset=FACTORY_PRESETS.find(p=>p.id===id);
  assert.ok(preset,'missing factory preset '+id);
 }
});