import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDrumGroove, parseDrumGrooveText, serializeDrumGroove} from '../src/drum-groove.js';
import {defaultDrumKit, defaultDrumSequence, hitsOnStep, validateDrumSequence} from '../src/drum-step-sequencer.js';
import {drumOwnerKey} from '../src/drum-lane-trigger.js';
import {defaultPresetSettings, validatePresetSettings} from '../src/preset-library.js';

test('6581drum groove round-trip', () => {
  const seq = defaultDrumSequence();
  seq.grid[0][0] = true;
  seq.grid[1][4] = true;
  const kit = defaultDrumKit();
  kit.name = 'Test groove';
  const groove = buildDrumGroove({name: kit.name, drumSequence: seq, drumKit: kit});
  const parsed = parseDrumGrooveText(serializeDrumGroove(groove));
  assert.equal(parsed.name, 'Test groove');
  assert.equal(parsed.drumSequence.grid[0][0], true);
  assert.equal(parsed.drumKit.lanes.kick.level, 100);
});

test('preset settings include drum pattern and kit defaults', () => {
  const settings = defaultPresetSettings();
  assert.ok(settings.performance.drumSequence);
  assert.ok(settings.performance.drumKit.lanes.kick);
  const clone = structuredClone(settings);
  clone.performance.drumSequence.grid[0][0] = true;
  const validated = validatePresetSettings(clone);
  assert.equal(validated.performance.drumSequence.grid[0][0], true);
});

test('four simultaneous lane hits use distinct drum owners', () => {
  const seq = validateDrumSequence(defaultDrumSequence());
  seq.grid.forEach((row) => {
    row[0] = true;
  });
  const hits = hitsOnStep(seq, 0);
  assert.equal(hits.length, 4);
  const owners = hits.map((h) => drumOwnerKey(h.lane));
  assert.equal(new Set(owners).size, 4);
});