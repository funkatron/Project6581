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
  assert.match(src, /drum-lane-rail/);
  assert.match(src, /drum-lane-head--hat-stack/);
  assert.match(readFileSync(new URL('../src/drum-slot-voice-ui.js', import.meta.url), 'utf8'), /Sequence sound/);
  assert.match(src, /drum-lane-mixer/);
  assert.match(src, /bindHelpGesture/);
  assert.match(src, /helpId: 'drum-cell'/);
  assert.match(src, /LANE_HELP/);
  assert.match(src, /setActiveStep/);
  assert.match(src, /DRUM_LANE_IDS/);
  assert.match(src, /DRUM_STEP_COUNT/);
  assert.match(readFileSync(new URL('../src/generator-led-ui.js', import.meta.url), 'utf8'), /genLedDrum/);
  assert.match(html, /drumGrooveExport/);
  assert.match(html, /drumGrooveImportBtn/);
  assert.match(html, /id="drumLfoControls"/);
  assert.match(html, /drum-bus-voice-shell/);
  assert.match(html, /id="drumBusTablist"/);
  assert.match(html, /id="drumSlotVoices"/);
  assert.match(html, /id="drumSidEngine"/);
  assert.match(html, /data-help="drum-groove"/);
  const drumStart = html.indexOf('id="drumPanel"');
  const scrollerAt = html.indexOf('id="drumGridScroller"', drumStart);
  const lfoAt = html.indexOf('id="drumLfoControls"', drumStart);
  assert.ok(scrollerAt >= 0 && lfoAt >= 0 && scrollerAt < lfoAt, 'step grid precedes LFO on DRUM tab');
});