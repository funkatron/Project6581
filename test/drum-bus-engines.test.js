import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDrumBusEngines,
  drumBusIndexForLane,
} from '../src/drum-bus-engines.js';
import {FACTORY_PRESETS} from '../src/preset-library.js';
import {createDefaultEngines, defaultDrumEngineSettings} from '../src/sid-engines.js';

test('default drum buses match the owner factory kit audition (2026-11-24)', () => {
  assert.deepEqual(defaultDrumBusEngines().map((bus) => bus.filter), [
    {cutoff: 2583, resonance: 100, volume: 100, mode: 'lowpass'},
    {cutoff: 1273, resonance: 93, volume: 73, mode: 'bandpass'},
    {cutoff: 5958, resonance: 23, volume: 100, mode: 'highpass'},
  ]);
});

test('every drum chip defaults to the 8580 while melodic chips follow the bank model', () => {
  const engines = createDefaultEngines(6581);
  assert.deepEqual(engines.map((engine) => engine.model), [6581, 6581, 6581, 8580, 8580, 8580]);
  assert.deepEqual(engines.slice(3).map((engine) => engine.outputBoostDb), [24, 24, 24]);
  assert.deepEqual(engines.slice(3).map((engine) => engine.pan), [0, 0, 0]);
  assert.equal(defaultDrumEngineSettings().model, 8580);
  for (const preset of FACTORY_PRESETS) {
    assert.deepEqual(preset.settings.sound.engines.slice(3).map((engine) => engine.model), [8580, 8580, 8580], preset.id);
  }
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