import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUM_LANE_COUNT,
  DRUM_STEP_COUNT,
  defaultDrumKit,
  defaultDrumSequence,
  hitsOnStep,
  validateDrumEngineBoost,
  validateDrumKit,
  validateDrumSequence,
} from '../src/drum-step-sequencer.js';

test('default drum kit and sequence validate', () => {
  const kit = validateDrumKit(defaultDrumKit());
  assert.equal(Object.keys(kit.lanes).length, DRUM_LANE_COUNT);
  assert.equal(kit.lanes.kick.level, 100);
  const seq = validateDrumSequence(defaultDrumSequence());
  assert.equal(seq.grid.length, DRUM_LANE_COUNT);
  assert.equal(seq.grid[0].length, DRUM_STEP_COUNT);
});

test('hitsOnStep lists active lanes', () => {
  const seq = defaultDrumSequence();
  seq.grid[0][0] = true;
  seq.grid[2][0] = true;
  const hits = hitsOnStep(validateDrumSequence(seq), 0);
  assert.deepEqual(
    hits.map((h) => h.lane),
    ['kick', 'ch'],
  );
});

test('validateDrumEngineBoost defaults to +6 dB', () => {
  assert.equal(validateDrumEngineBoost(), 6);
  assert.equal(validateDrumEngineBoost(12), 12);
  assert.throws(() => validateDrumEngineBoost(3), /0, 6, or 12/);
});