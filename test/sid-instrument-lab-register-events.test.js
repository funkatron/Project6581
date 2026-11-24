import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSidRegisterEvents,
  validateSidEvents,
} from '../src/features/sid-instrument-lab/analyze-register-events.js';

const event = (cycle, register, value, chip = 0) => ({ cycle, register, value, chip });

test('identifies gate transitions and waveform changes independently by voice', () => {
  const result = analyzeSidRegisterEvents([
    event(0, 4, 0x21),   // voice 1: saw + gate
    event(1, 11, 0x41),  // voice 2: pulse + gate
    event(2, 4, 0x20),   // voice 1: gate off
    event(3, 4, 0x41),   // voice 1: pulse + gate
    event(4, 11, 0x40),  // voice 2: gate off
  ]);
  assert.equal(result.eventCount, 5);
  assert.deepEqual(result.voices[0].noteOns, [0, 3]);
  assert.deepEqual(result.voices[0].noteOffs, [2]);
  assert.deepEqual(result.voices[1].noteOns, [1]);
  assert.deepEqual(result.voices[1].noteOffs, [4]);
  assert.deepEqual(result.voices[0].waveformChanges.map(x => x.waveformBits), [0x20, 0x40]);
});

test('tracks shared chip filter separately, including multiple SID chips', () => {
  const result = analyzeSidRegisterEvents([
    event(0, 22, 0x7f),
    event(1, 4, 0x11, 1),
    event(2, 23, 0xf1, 1),
    event(3, 24, 0x1f),
  ]);
  assert.deepEqual(result.filters.map(x => [x.chip, x.events.length]), [[0, 2], [1, 1]]);
  assert.equal(result.voices[0].chip, 1);
  assert.equal(result.voices[0].voice, 1);
});

test('rejects malformed, unsorted, or out-of-range event data', () => {
  assert.throws(() => validateSidEvents(null), TypeError);
  assert.throws(() => validateSidEvents([event(0, 4, 256)]), RangeError);
  assert.throws(() => validateSidEvents([event(0, 32, 1)]), RangeError);
  assert.throws(() => validateSidEvents([event(2, 4, 1), event(1, 4, 0)]), /cycle-ordered/);
  assert.throws(() => validateSidEvents([{ cycle: 0, chip: -1, register: 4, value: 1 }]), RangeError);
});

test('does not mutate input and handles an empty trace', () => {
  const original = [event(0, 4, 0x11)];
  analyzeSidRegisterEvents(original);
  assert.equal(original[0].value, 0x11);
  assert.deepEqual(analyzeSidRegisterEvents([]), { eventCount: 0, voices: [], filters: [] });
});
