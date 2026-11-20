import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drumBusShowsPitchEnvelope,
  drumBusShowsPulse,
  drumFactoryPresetOptions,
  drumLfoTargetsForKit,
} from '../src/drum-voice-ui-policy.js';
import {FACTORY_PRESETS} from '../src/preset-library.js';

test('drumBusShowsPulse only for square', () => {
  assert.equal(drumBusShowsPulse('square'), true);
  assert.equal(drumBusShowsPulse('noise'), false);
});

test('drumBusShowsPitchEnvelope follows enabled flag or melodic waves', () => {
  assert.equal(drumBusShowsPitchEnvelope({wave: 'noise', pitchEnvelope: {enabled: true}}), true);
  assert.equal(drumBusShowsPitchEnvelope({wave: 'noise', pitchEnvelope: {enabled: false}}), false);
  assert.equal(drumBusShowsPitchEnvelope({wave: 'triangle', pitchEnvelope: {enabled: false}}), true);
});

test('drumFactoryPresetOptions lists drum category presets', () => {
  const drums = drumFactoryPresetOptions(FACTORY_PRESETS);
  assert.ok(drums.length >= 6);
  assert.ok(drums.every(preset => preset.category === 'Drums'));
});

test('drumLfoTargetsForKit omits pulse without a pulse bus', () => {
  const without = drumLfoTargetsForKit(['noise', 'triangle', 'noise']);
  assert.ok(!without.includes('pulse'));
  const withSquare = drumLfoTargetsForKit(['triangle', 'square', 'noise']);
  assert.ok(withSquare.includes('pulse'));
});