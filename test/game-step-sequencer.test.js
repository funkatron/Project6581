import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSequence,validateSequence,sequenceEvent} from '../src/game-step-sequencer.js';
import {defaultPresetSettings,validatePresetSettings} from '../src/preset-library.js';

test('default Game Arp phrase contains sixteen independent editable steps',()=>{
 const phrase=defaultSequence();
 assert.equal(phrase.length,16);
 assert.equal(phrase.steps.length,16);
 assert.notStrictEqual(phrase.steps[0],defaultSequence().steps[0]);
 assert.deepEqual(validateSequence(phrase),phrase);
});

test('four, eight and sixteen steps wrap at their own lengths',()=>{
 for(const length of [4,8,16]){
  const phrase=defaultSequence();
  phrase.length=length;
  const at=sequenceEvent(60,phrase,length+2);
  assert.equal(at.index,2);
  assert.equal(at.note,67);
  assert.equal(at.gate,true);
 }
});

test('rest steps never request a note, and note values stay in MIDI bounds',()=>{
 const phrase=defaultSequence();
 const rest=sequenceEvent(48,phrase,3);
 assert.equal(rest.gate,false);
 assert.equal(rest.index,3);
 phrase.steps[0].offset=-12;
 assert.equal(sequenceEvent(0,phrase,0).note,0);
 phrase.steps[0].offset=24;
 assert.equal(sequenceEvent(120,phrase,0).note,127);
 phrase.steps[0].duration=25;
 assert.equal(sequenceEvent(60,phrase,0).duration,25);
});

test('malformed sequence cannot enter a preset',()=>{
 const original=defaultSequence();
 for(const invalid of [
  {...original,length:7},
  {...original,steps:original.steps.slice(1)},
  {...original,steps:[{...original.steps[0],offset:50},...original.steps.slice(1)]},
  {...original,steps:[{...original.steps[0],gate:'yes'},...original.steps.slice(1)]},
  {...original,steps:[{...original.steps[0],duration:12},...original.steps.slice(1)]}
 ])assert.throws(()=>validateSequence(invalid));
});

test('version-3 presets retain an editable phrase without invalidating old files',()=>{
 const base=defaultPresetSettings();
 assert.equal(base.performance.game.sequence.length,16);
 base.performance.game.style='custom';
 base.performance.game.sequence.length=8;
 base.performance.game.sequence.steps[0].offset=-5;
 base.performance.game.sequence.steps[0].duration=55;
 const saved=validatePresetSettings(base);
 assert.equal(saved.performance.game.sequence.length,8);
 assert.equal(saved.performance.game.sequence.steps[0].offset,-5);
 assert.equal(saved.performance.game.sequence.steps[0].duration,55);
 const legacy=defaultPresetSettings();
 delete legacy.performance.game.sequence;
 const compatible=validatePresetSettings(legacy);
 assert.equal(compatible.performance.game.sequence.length,16);
});
