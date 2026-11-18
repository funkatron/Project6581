import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('index ships drum grid scroller mount points', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="drumGridScroller"/);
  assert.match(html, /id="drumGrid"/);
});

test('drum panel module builds grid cells and lane levels', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const src = readFileSync(new URL('../src/drum-panel-ui.js', import.meta.url), 'utf8');
  assert.match(src, /drum-cell/);
  assert.match(src, /drum-lane-level/);
  assert.match(src, /setActiveStep/);
  assert.match(src, /DRUM_LANE_IDS/);
  assert.match(src, /DRUM_STEP_COUNT/);
  assert.match(readFileSync(new URL('../src/generator-led-ui.js', import.meta.url), 'utf8'), /genLedDrum/);
  assert.match(html, /drumGrooveExport/);
  assert.match(html, /drumGrooveImportBtn/);
  assert.match(html, /id="drumLfoControls"/);
});