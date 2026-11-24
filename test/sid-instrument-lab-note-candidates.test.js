import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSidNoteCandidates } from '../src/features/sid-instrument-lab/extract-note-candidates.js';

const e = (cycle, register, value, chip = 0) => ({ cycle, register, value, chip });

test('extracts gated notes with initial register state and changes', () => {
  const result = extractSidNoteCandidates([
    e(0, 0, 0x34), e(0, 1, 0x12), e(1, 5, 0x21),
    e(2, 4, 0x21), e(3, 0, 0x56), e(5, 4, 0x20),
  ]);
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].startCycle, 2);
  assert.equal(result.notes[0].gateOffCycle, 5);
  assert.equal(result.notes[0].endCycle, 5);
  assert.deepEqual(result.notes[0].initialRegisters.slice(0, 2), [0x34, 0x12]);
  assert.equal(result.notes[0].events.length, 3);
});

test('tracks separate chips and shared filter writes', () => {
  const result = extractSidNoteCandidates([
    e(0, 4, 0x11), e(0, 11, 0x41, 1),
    e(1, 22, 0x7f), e(2, 4, 0x10),
    e(3, 11, 0x40, 1),
  ]);
  assert.deepEqual(result.notes.map(n => [n.chip, n.voice]), [[0, 1], [1, 2]]);
  assert.equal(result.chipFilterEvents[0].events.length, 1);
});

test('marks sustained notes incomplete at explicit endCycle', () => {
  const result = extractSidNoteCandidates([e(2, 4, 0x21)], { endCycle: 100 });
  assert.equal(result.notes[0].endCycle, 100);
  assert.equal(result.notes[0].incomplete, true);
  assert.equal(result.notes[0].gateOffCycle, null);
});

test('rejects invalid endCycle and returns empty output for empty input', () => {
  assert.throws(() => extractSidNoteCandidates([e(2, 4, 0x21)], { endCycle: 1 }), /endCycle/);
  assert.equal(extractSidNoteCandidates([]).notes.length, 0);
});
