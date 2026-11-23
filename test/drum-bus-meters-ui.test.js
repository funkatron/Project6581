import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('drum bus meters module exposes three bus labels', () => {
  const src = readFileSync(new URL('../src/drum-bus-meters-ui.js', import.meta.url), 'utf8');
  assert.match(src, /Kick/);
  assert.match(src, /Snare/);
  assert.match(src, /OH\/CH/);
  assert.match(src, /mountDrumBusMeters/);
});