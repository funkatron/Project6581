import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUM_ENGINE_FILTER_ROUTING,
  drumEngineFilterRegisters,
} from '../src/drum-engine-filter.js';

test('drumEngineFilterRegisters routes all three voices through the chip filter', () => {
  const regs = {cutoff: 1024, resonance: 8, mode: 'lowpass', volume: 15, routing: 1};
  const merged = drumEngineFilterRegisters(regs);
  assert.equal(merged.routing, DRUM_ENGINE_FILTER_ROUTING);
  assert.equal(merged.cutoff, 1024);
});