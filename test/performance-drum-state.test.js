import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceDrumState} from '../src/performance-drum-state.js';

test('performance drum state tracks running transport', () => {
  const drum = createPerformanceDrumState();
  const seen = [];
  drum.subscribe((s) => seen.push(s.drumOn));
  assert.equal(drum.drumOn, false);
  assert.ok(drum.setRunning(true));
  assert.equal(drum.drumOn, true);
  assert.equal(seen.join(','), 'false,true');
  assert.equal(drum.setRunning(true), false);
  drum.setRunning(false);
  assert.equal(seen.at(-1), false);
});