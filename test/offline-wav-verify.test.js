import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyListeningKickWav} from '../src/offline-wav-verify.js';

test('offline kick compare script writes verified listening WAVs', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'p6581-kick-'));
  const result = spawnSync(
    process.execPath,
    ['scripts/offline-kick-wave-compare.mjs', '--out', out],
    {cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8'},
  );
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || 'offline render failed',
  );
  const combined = readFileSync(path.join(out, 'kick-triangle-plus-noise.wav'));
  const report = verifyListeningKickWav(combined);
  assert.ok(report.prePeak <= 400, 'pre-roll should be quiet');
  assert.ok(report.hits.length >= 4, 'four kicks');
  assert.ok(report.hits[0].atMs >= 180, 'first kick after padding');
});