import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createSidOfflineRenderer } from '../src/features/sid-instrument-lab/render-residfp-offline.js';

const wasmPath = new URL('../dist/residfp.wasm', import.meta.url);
let hasWasm = false;
try { await access(wasmPath); hasWasm = true; } catch { /* Build artifact optional locally. */ }

test('real reSIDfp WASM renders a non-silent PAL tone', { skip: !hasWasm && 'dist/residfp.wasm not present; run npm run build:wasm' }, async () => {
  const wasm = await readFile(wasmPath);
  const renderer = await createSidOfflineRenderer(wasm, { sampleRate: 48000, model: 6581 });
  const events = [
    { cycle: 0, chip: 0, register: 0, value: 0x00 },
    { cycle: 0, chip: 0, register: 1, value: 0x20 },
    { cycle: 0, chip: 0, register: 5, value: 0x09 },
    { cycle: 0, chip: 0, register: 6, value: 0xf0 },
    { cycle: 0, chip: 0, register: 4, value: 0x21 },
    { cycle: 985248 / 2, chip: 0, register: 4, value: 0x20 },
  ];
  const result = renderer.render(events, { endCycle: 985248 });
  assert.equal(result.pcm.length, 48000);
  const peak = result.pcm.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  assert.ok(peak > 0, 'Expected non-silent reSIDfp audio');
});
