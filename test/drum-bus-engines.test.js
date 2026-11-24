import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDrumBusEngines,
  drumBusIndexForLane,
} from '../src/drum-bus-engines.js';
import {FACTORY_PRESETS} from '../src/preset-library.js';

test('default drum buses match owner kick and hat audition', () => {
  const buses = defaultDrumBusEngines();
  assert.equal(buses[0].filter.mode, 'lowpass');
  assert.equal(buses[0].filter.cutoff, 2138);
  assert.equal(buses[2].filter.mode, 'highpass');
  assert.equal(buses[2].filter.cutoff, 1894);
  assert.equal(buses[2].filter.resonance, 0);
});

test('drumBusIndexForLane maps lanes to buses', () => {
  assert.equal(drumBusIndexForLane('kick'), 0);
  assert.equal(drumBusIndexForLane('sn'), 1);
  assert.equal(drumBusIndexForLane('ch'), 2);
  assert.equal(drumBusIndexForLane('oh'), 2);
});

test('every factory preset validates drumBuses', () => {
  for (const preset of FACTORY_PRESETS) {
    assert.equal(preset.settings.sound.drumBuses.length, 3, preset.id);
  }
});