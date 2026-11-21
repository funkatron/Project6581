/**
 * Export a captured SID register trace as a mono PCM WAV using Project6581's
 * existing reSIDfp WASM build and WAV encoder.
 */
import { createSidOfflineRenderer } from './render-residfp-offline.js';
import { encodeWav } from '../../wav-encoder.js';

export async function renderSidTraceWav(wasmBytes, events, {
  sampleRate = 48000, model = 6581, chip = 0, voice = null,
  endCycle, instantiate,
} = {}) {
  const renderer = await createSidOfflineRenderer(wasmBytes, {
    sampleRate, model, ...(instantiate ? { instantiate } : {}),
  });
  const result = renderer.render(events, { endCycle, chip, voice });
  return {
    wav: new Uint8Array(encodeWav([result.pcm], result.sampleRate)),
    frames: result.pcm.length,
    sampleRate: result.sampleRate,
    timing: result.timing,
    chip: result.chip,
    voice: result.voice,
  };
}
