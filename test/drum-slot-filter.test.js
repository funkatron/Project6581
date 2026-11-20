import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUM_SLOT_FILTER_ROUTING,
  drumSlotFilterRegisters,
  filterRoutingMaskForDrumSlot,
} from '../src/drum-slot-filter.js';

test('filterRoutingMaskForDrumSlot matches SID voice bits', () => {
  assert.deepEqual(DRUM_SLOT_FILTER_ROUTING, [1, 2, 4]);
  assert.equal(filterRoutingMaskForDrumSlot(0), 1);
  assert.equal(filterRoutingMaskForDrumSlot(1), 2);
  assert.equal(filterRoutingMaskForDrumSlot(2), 4);
});

test('drumSlotFilterRegisters keeps lane filter and scopes routing', () => {
  const lane = {cutoff: 900, resonance: 8, mode: 'lowpass', volume: 10};
  const kick = drumSlotFilterRegisters(lane, 0);
  assert.equal(kick.routing, 1);
  assert.equal(kick.mode, 'lowpass');
  const hat = drumSlotFilterRegisters({...lane, mode: 'highpass', volume: 7}, 2);
  assert.equal(hat.routing, 4);
  assert.equal(hat.mode, 'highpass');
});