import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUM_LANE_COUNT,
  DRUM_STEP_COUNT,
  coalesceDrumGrid,
  defaultDrumKit,
  defaultDrumSequence,
  defaultFactoryDrumGrid,
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

test('factory groove matches the owner export (2026-11-24)', () => {
  const steps = (row) => row.flatMap((on, i) => (on ? [i + 1] : []));
  assert.deepEqual(defaultFactoryDrumGrid().map(steps), [
    [1, 2, 3, 9, 13, 16],
    [5, 12],
    [1, 2, 4, 5, 6, 8, 9, 10, 13, 14, 16],
    [3, 7, 11, 15],
  ]);
  assert.deepEqual(defaultDrumSequence().rate, 4);
  assert.equal(defaultDrumSequence().sync, true);
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

test('factory drum kit matches the owner audition (2026-11-24)', () => {
  const kit = validateDrumKit(defaultDrumKit());
  const off = {enabled: false, interpolation: 'linear', end: 'zero', points: [{ms: 0, semitones: 0}]};
  assert.equal(kit.name, 'Factory 6581');
  assert.deepEqual(
    Object.fromEntries(Object.entries(kit.lanes).map(([id, lane]) => [id, [lane.level, lane.pitchOffsetSemitones]])),
    {kick: [100, 48], sn: [70, 48], ch: [20, 36], oh: [20, 36]},
  );
  assert.deepEqual(kit.lanes.kick.voice, {decay: 0, sustain: 0, pitchEnvelope: off});
  assert.deepEqual(kit.lanes.sn.voice, {decay: 0.16, sustain: 0, pitchEnvelope: off});
  assert.deepEqual(kit.lanes.ch.voice, {decay: 0.07});
  assert.equal(kit.lanes.oh.voice, undefined);
  assert.notEqual(defaultDrumKit().lanes.kick.voice.pitchEnvelope, defaultDrumKit().lanes.kick.voice.pitchEnvelope);
});

test('a saved kit without hat pitch offsets still loads them at +48', () => {
  const kit = defaultDrumKit();
  delete kit.lanes.ch.pitchOffsetSemitones;
  delete kit.lanes.oh.pitchOffsetSemitones;
  const loaded = validateDrumKit(kit);
  assert.equal(loaded.lanes.ch.pitchOffsetSemitones, 48);
  assert.equal(loaded.lanes.oh.pitchOffsetSemitones, 48);
});