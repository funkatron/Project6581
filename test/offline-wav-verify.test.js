import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyListeningKickWav} from '../src/offline-wav-verify.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const committedKick = path.join(
  repoRoot,
  'docs/listening-samples/combined-wave/kick-triangle-plus-noise.wav',
);
const wasmPath = path.join(repoRoot, 'dist/residfp.wasm');

test('committed combined kick listening WAV passes offline verify', () => {
  assert.ok(existsSync(committedKick), 'regenerate with npm run drum-audio:offline-kick');
  const combined = readFileSync(committedKick);
  const report = verifyListeningKickWav(combined, {minHitPeakInt16: 2000});
  assert.ok(report.prePeak <= 400, 'pre-roll should be quiet');
  assert.ok(report.hits.length >= 4, 'four kicks');
  assert.ok(report.hits[0].atMs >= 180, 'first kick after padding');
});

test('offline kick compare script writes verified listening WAVs', (t) => {
  if (!existsSync(wasmPath)) {
    t.skip('dist/residfp.wasm not built (run scripts/build-residfp.sh with Emscripten)');
    return;
  }
  const out = mkdtempSync(path.join(tmpdir(), 'p6581-kick-'));
  const result = spawnSync(
    process.execPath,
    ['scripts/offline-kick-wave-compare.mjs', '--out', out],
    {cwd: repoRoot, encoding: 'utf8'},
  );
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || 'offline render failed',
  );
  const combined = readFileSync(path.join(out, 'kick-triangle-plus-noise.wav'));
  const report = verifyListeningKickWav(combined, {minHitPeakInt16: 2000});
  assert.ok(report.prePeak <= 400, 'pre-roll should be quiet');
  assert.ok(report.hits.length >= 4, 'four kicks');
  assert.ok(report.hits[0].atMs >= 180, 'first kick after padding');
});