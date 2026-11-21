import test from 'node:test';
import assert from 'node:assert/strict';
import { createSidOfflineRenderer } from '../src/features/sid-instrument-lab/render-residfp-offline.js';

function mockWasm() {
  const writes = [];
  const memory = { buffer: new ArrayBuffer(4096 * 4 + 128) };
  const exports = {
    memory,
    sid_init: () => 1,
    sid_reset: () => writes.push(['reset']),
    sid_write: (register, value) => writes.push([register, value]),
    sid_render: frames => {
      const view = new Int16Array(memory.buffer, 0, frames * 2);
      for (let i = 0; i < frames; i++) {
        view[i * 2] = 100;
        view[i * 2 + 1] = 300;
      }
      return frames;
    },
    sid_pcm_ptr: () => 0,
  };
  return { instantiate: async () => ({ instance: { exports } }), writes };
}
const event = (cycle, register, value, chip = 0) => ({ cycle, register, value, chip });

test('headless renderer reuses SID register writes and converts stereo PCM to mono', async () => {
  const wasm = mockWasm();
  const renderer = await createSidOfflineRenderer(new Uint8Array(), {
    sampleRate: 48000, instantiate: wasm.instantiate,
  });
  const result = renderer.render([event(0, 4, 0x21), event(985248, 4, 0x20)], {
    endCycle: 985248,
  });
  assert.equal(result.pcm.length, 48000);
  assert.equal(result.pcm[0], 200);
  assert.ok(wasm.writes.some(write => write[0] === 4 && write[1] === 0x21));
  assert.equal(result.timing, 'sample-quantized');
});

test('voice isolation excludes other voice registers but retains filter writes', async () => {
  const wasm = mockWasm();
  const renderer = await createSidOfflineRenderer(new Uint8Array(), { instantiate: wasm.instantiate });
  renderer.render([
    event(0, 4, 0x21),
    event(0, 11, 0x41),
    event(0, 22, 0x7f),
  ], { endCycle: 100, voice: 1 });
  assert.ok(wasm.writes.some(write => write[0] === 4 && write[1] === 0x21));
  assert.ok(!wasm.writes.some(write => write[0] === 11));
  assert.ok(wasm.writes.some(write => write[0] === 22 && write[1] === 0x7f));
});

test('rejects invalid options and excessive durations', async () => {
  const wasm = mockWasm();
  await assert.rejects(createSidOfflineRenderer(new Uint8Array(), {
    model: 1234, instantiate: wasm.instantiate,
  }), /model/);
  const renderer = await createSidOfflineRenderer(new Uint8Array(), { instantiate: wasm.instantiate });
  assert.throws(() => renderer.render([], { endCycle: 985248 * 61 }), /budget/);
  assert.throws(() => renderer.render([], { voice: 4 }), /voice/);
});
