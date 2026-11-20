import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultDrumSequence, DRUM_LANE_IDS, hitsOnStep} from '../src/drum-step-sequencer.js';

function toggleCell(sequence, rowIndex, step) {
  const grid = sequence.grid.map((r, ri) =>
    ri === rowIndex ? r.map((c, ci) => (ci === step ? !c : c)) : [...r],
  );
  return {...sequence, grid};
}

test('double-toggle on same cell restores rest when using fresh sequence each tap', () => {
  let seq = defaultDrumSequence();
  const row = DRUM_LANE_IDS.indexOf('kick');
  const step = 0;
  seq = toggleCell(seq, row, step);
  assert.equal(seq.grid[row][step], true);
  seq = toggleCell(seq, row, step);
  assert.equal(seq.grid[row][step], false);
});

test('independent lanes on one step all appear in hitsOnStep', () => {
  let seq = defaultDrumSequence();
  const step = 8;
  for (const laneId of DRUM_LANE_IDS) {
    const row = DRUM_LANE_IDS.indexOf(laneId);
    seq = toggleCell(seq, row, step);
  }
  const hits = hitsOnStep(seq, step);
  assert.equal(hits.length, DRUM_LANE_IDS.length);
  assert.deepEqual(hits.map((h) => h.lane).sort(), [...DRUM_LANE_IDS].sort());
});

test('drum panel reads live sequence when toggling cells', () => {
  const src = readFileSync(new URL('../src/drum-panel-ui.js', import.meta.url), 'utf8');
  assert.match(src, /getDrumSequence\(\)/);
  assert.match(src, /const current = getDrumSequence\(\)/);
  assert.match(src, /const wasOn = Boolean\(current\.grid\[rowIndex\]\[step\]\)/);
  assert.match(src, /getDrumKit\(\)/);
});