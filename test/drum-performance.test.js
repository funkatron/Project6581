import test from 'node:test';
import assert from 'node:assert/strict';
import {drumStepIntervalMs} from '../src/drum-performance.js';
import {defaultDrumSequence} from '../src/drum-step-sequencer.js';

test('drumStepIntervalMs at 120 BPM and 1/16 rate', () => {
  const seq = defaultDrumSequence();
  seq.rate = 4;
  seq.sync = true;
  assert.equal(drumStepIntervalMs(seq, 120), 125);
});

// Drum controls → transport: test/transport-state.test.js (bindTransportDom).