import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseDrumFilterLane, drumStepFilterRoutingMask} from '../src/drum-step-filter.js';
import {resolveDrumHitsOnStep} from '../src/drum-voice-policy.js';

test('chooseDrumFilterLane prefers kick on busy steps', () => {
  const hits = resolveDrumHitsOnStep([
    {lane: 'kick', laneIndex: 0},
    {lane: 'sn', laneIndex: 1},
    {lane: 'ch', laneIndex: 2},
  ]);
  assert.equal(chooseDrumFilterLane(hits), 'kick');
  assert.equal(drumStepFilterRoutingMask(0), 1);
});

test('chooseDrumFilterLane uses sn when kick absent', () => {
  const hits = resolveDrumHitsOnStep([
    {lane: 'sn', laneIndex: 1},
    {lane: 'ch', laneIndex: 2},
  ]);
  assert.equal(chooseDrumFilterLane(hits), 'sn');
});