import test from 'node:test';
import assert from 'node:assert/strict';
import {drumStepIntervalMs, readDrumSequenceFromDom} from '../src/drum-performance.js';
import {defaultDrumSequence} from '../src/drum-step-sequencer.js';

test('drumStepIntervalMs at 120 BPM and 1/16 rate', () => {
  const seq = defaultDrumSequence();
  seq.rate = 4;
  seq.sync = true;
  assert.equal(drumStepIntervalMs(seq, 120), 125);
});

test('readDrumSequenceFromDom merges transport controls', () => {
  const $ = (id) => {
    if (id === 'drumRate') return {value: '8'};
    if (id === 'drumSync') return {checked: false};
    if (id === 'drumBpm') return {value: '140'};
    return null;
  };
  const merged = readDrumSequenceFromDom($, defaultDrumSequence());
  assert.equal(merged.rate, 8);
  assert.equal(merged.sync, false);
  assert.equal(merged.localBpm, 140);
});