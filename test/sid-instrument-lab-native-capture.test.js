import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSidLabToneFixture } from './fixtures/sid-lab-tone.js';
import { assertToneFixtureWrites } from './fixtures/sid-lab-expected-writes.js';
import { captureSidRegisters } from '../src/features/sid-instrument-lab/capture-sid-registers.js';
import { createProcessSidBackend } from '../scripts/sid-lab-process-backend.mjs';

const captureBinary = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'sid-lab-capture');

let binaryReady = false;
try {
  await access(captureBinary);
  binaryReady = true;
} catch {
  binaryReady = false;
}

test('native libsidplayfp capture preserves fixture SID write order', {
  skip: binaryReady ? false : 'Run scripts/build-sid-lab-capture.sh to enable',
}, async () => {
  const backend = createProcessSidBackend(captureBinary, { timeoutMs: 30_000 });
  const envelope = await captureSidRegisters(backend, createSidLabToneFixture(), {
    subtune: 1,
    maxCycles: 500_000,
  });
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.timebase, 'c64-cycles');
  assert.equal(assertToneFixtureWrites(envelope.events), true);
  const cycles = envelope.events.map(event => event.cycle);
  for (let i = 1; i < cycles.length; i++)
    assert.ok(cycles[i] >= cycles[i - 1], 'cycle timestamps should be monotonic');
});