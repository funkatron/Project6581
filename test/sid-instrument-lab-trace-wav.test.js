import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSidTraceWav } from '../src/features/sid-instrument-lab/render-trace-wav.js';

test('offline reSIDfp output becomes a valid PCM WAV', async () => {
  const memory = { buffer: new ArrayBuffer(16384 + 128) };
  const exports = {
    memory,
    sid_init: () => 1,
    sid_reset: () => {},
    sid_write: () => {},
    sid_render: count => {
      const output = new Int16Array(memory.buffer, 0, count * 2);
      for (let i = 0; i < count; i++) {
        output[i * 2] = 200;
        output[i * 2 + 1] = 200;
      }
      return count;
    },
    sid_pcm_ptr: () => 0,
  };
  const result = await renderSidTraceWav(new Uint8Array(), [], {
    endCycle: 985248, sampleRate: 8000,
    instantiate: async () => ({ instance: { exports } }),
  });
  const view = new DataView(result.wav.buffer, result.wav.byteOffset, result.wav.byteLength);
  assert.equal(new TextDecoder().decode(result.wav.subarray(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(result.wav.subarray(8, 12)), 'WAVE');
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 8000);
  assert.equal(view.getUint32(40, true), 16000);
  assert.equal(view.getInt16(44, true), 200);
});
