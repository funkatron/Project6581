import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultPresetSettings, validateDrumLfo, validatePresetSettings} from '../src/preset-library.js';

test('default preset includes validated drum LFO', () => {
  const settings = defaultPresetSettings();
  assert.equal(settings.sound.drumLfo.engines, '4');
  assert.equal(settings.sound.drumLfo.enabled, false);
});

test('validateDrumLfo rejects invalid targets', () => {
  const row = {...defaultPresetSettings().sound.drumLfo, enabled: true, target: 'detune'};
  assert.throws(() => validateDrumLfo(row), RangeError);
});

test('preset round-trip preserves drum LFO', () => {
  const base = defaultPresetSettings();
  base.sound.drumLfo = validateDrumLfo({
    enabled: true,
    sync: true,
    wave: 'triangle',
    rate: 2,
    syncDivision: 8,
    depth: 0.35,
    target: 'volume',
    phase: 0,
    seed: 2,
  });
  const again = validatePresetSettings(base);
  assert.equal(again.sound.drumLfo.target, 'volume');
  assert.equal(again.sound.drumLfo.depth, 0.35);
});

test('index exposes drum LFO mount', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="drumLfoControls"/);
  assert.match(readFileSync(new URL('../src/sid-studio.js', import.meta.url), 'utf8'), /mountDrumLfoPanel/);
  assert.match(readFileSync(new URL('../src/sid-studio.js', import.meta.url), 'utf8'), /drumLfo:validateDrumLfo/);
});