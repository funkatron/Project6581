import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUM_VOICE_BUS_HEX,
  contrastInkOnBackground,
  relativeLuminance,
} from '../src/drum-voice-colors.js';

test('bus tab hex matches rail bus keys', () => {
  assert.equal(Object.keys(DRUM_VOICE_BUS_HEX).join(','), 'kick,sn,hat');
});

test('contrastInkOnBackground picks light or dark ink', () => {
  assert.equal(contrastInkOnBackground(DRUM_VOICE_BUS_HEX.kick), '#f8f4ef');
  assert.ok(relativeLuminance(DRUM_VOICE_BUS_HEX.kick) < relativeLuminance('#ebe3d8'));
  assert.match(contrastInkOnBackground('#ebe3d8'), /^#(?:f8f4ef|252925)$/);
});