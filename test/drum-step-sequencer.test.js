import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUM_LANE_COUNT,
  DRUM_STEP_COUNT,
  coalesceDrumGrid,
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

test('coalesceDrumGrid trims legacy six-row grids', () => {
  const legacy = Array.from({ length: 6 }, () => Array(DRUM_STEP_COUNT).fill(false));
  const coalesced = coalesceDrumGrid(legacy);
  assert.equal(coalesced.length, DRUM_LANE_COUNT);
});

test('coalesceDrumGrid pads short grids and heals bad rows', () => {
  const short = [Array(DRUM_STEP_COUNT).fill(false), null];
  const coalesced = coalesceDrumGrid(short);
  assert.equal(coalesced.length, DRUM_LANE_COUNT);
  assert.equal(coalesced[1].every((cell) => cell === false), true);
});

test('validateDrumSequence accepts missing grid by resetting pattern', () => {
  const seq = validateDrumSequence({ ...defaultDrumSequence(), grid: undefined });
  assert.equal(seq.grid.length, DRUM_LANE_COUNT);
});

test('validateDrumSequence coalesces legacy six-row grids', () => {
  const legacy = Array.from({ length: 6 }, () => Array(DRUM_STEP_COUNT).fill(false));
  legacy[0][0] = true;
  const seq = validateDrumSequence({ ...defaultDrumSequence(), grid: legacy });
  assert.equal(seq.grid.length, DRUM_LANE_COUNT);
  assert.equal(seq.grid[0][0], true);
});

test('validateDrumEngineBoost defaults to +24 dB', () => {
  assert.equal(validateDrumEngineBoost(), 24);
  assert.equal(validateDrumEngineBoost(24), 24);
  assert.throws(() => validateDrumEngineBoost(3), /one of/);
});

test('default drum kit hats use +24 semitone pitch offset', () => {
  const kit = validateDrumKit(defaultDrumKit());
  assert.equal(kit.lanes.ch.pitchOffsetSemitones, 24);
  assert.equal(kit.lanes.oh.pitchOffsetSemitones, 24);
  assert.equal(kit.lanes.kick.pitchOffsetSemitones, 0);
});