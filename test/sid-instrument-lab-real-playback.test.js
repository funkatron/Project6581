import test from 'node:test';
import assert from 'node:assert/strict';
import { createSidLabToneFixture } from './fixtures/sid-lab-tone.js';
import { probeSidPlayback } from '../scripts/sid-lab-playback-probe.mjs';
import { parseSidHeader } from '../src/features/sid-instrument-lab/parse-sid-header.js';

test('original PSID fixture has valid metadata and 6510 entry points', () => {
  const bytes = createSidLabToneFixture();
  const header = parseSidHeader(bytes);
  assert.equal(header.format, 'PSID');
  assert.equal(header.loadAddress, 0x1000);
  assert.equal(header.initAddress, 0x1000);
  assert.equal(header.playAddress, 0x101f);
});

let available = false;
try {
  await import('libsidplayfp-wasm');
  available = true;
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

test('real libsidplayfp executes original PSID fixture and renders audio', {
  skip: !available && 'Install libsidplayfp-wasm to run actual 6510 integration test',
}, async () => {
  const result = await probeSidPlayback(createSidLabToneFixture(), { seconds: 1 });
  assert.ok(result.nonSilent, 'Expected audible 6510-driven SID output');
  assert.ok(result.peak > 0);
  assert.ok(result.samples > 1000);
  assert.equal(result.captureSupported, false);
});
