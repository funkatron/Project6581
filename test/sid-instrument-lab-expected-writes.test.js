import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertToneFixtureWrites, SID_LAB_TONE_EXPECTED_WRITES,
} from './fixtures/sid-lab-expected-writes.js';

const events = SID_LAB_TONE_EXPECTED_WRITES.map((write, i) => ({
  cycle: i * 6, chip: 0, register: write.register, value: write.value,
}));

test('expected SID bus writes match fixture init order', () => {
  assert.deepEqual(SID_LAB_TONE_EXPECTED_WRITES.map(write => write.address), [
    0xd418, 0xd400, 0xd401, 0xd405, 0xd406, 0xd404,
  ]);
  assert.equal(assertToneFixtureWrites(events), true);
});

test('fixture trace matcher tolerates extra player initialization writes', () => {
  assert.equal(assertToneFixtureWrites([
    { cycle: 0, chip: 0, register: 4, value: 0 },
    ...events,
    { cycle: 50, chip: 0, register: 4, value: 0 },
  ]), true);
});

test('fixture trace matcher rejects missing, reordered, and wrong-chip writes', () => {
  assert.throws(() => assertToneFixtureWrites(events.slice(1)), /Incomplete/);
  assert.throws(() => assertToneFixtureWrites([...events].reverse()), /Incomplete/);
  assert.throws(() => assertToneFixtureWrites(events.map(e => ({ ...e, chip: 1 }))), /Incomplete/);
});
