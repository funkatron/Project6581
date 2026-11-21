/**
 * Headless reSIDfp WASM renderer for captured SID register events.
 *
 * No AudioContext/AudioWorklet is involved. Events use C64 clock cycles;
 * the existing bridge renders PCM frames, so conversion to sample boundaries
 * quantizes write timing to one output frame. Exact cycle-level write timing
 * would require a native bridge extension.
 */
import { validateSidEvents } from './analyze-register-events.js';

const PAL_CLOCK = 985248;
const NTSC_CLOCK = 1022727;
const MAX_FRAMES = 48_000 * 60;

export async function createSidOfflineRenderer(wasmBytes, {
  sampleRate = 48000, model = 6581, clock = 'PAL',
} = {}) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) {
    throw new RangeError('Invalid sample rate');
  }
  if (![6581, 8580].includes(model)) throw new RangeError('Invalid SID model');
  if (!['PAL', 'NTSC'].includes(clock)) throw new RangeError('Invalid SID clock');
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  const e = instance.exports;
  if (!e.memory || !e.sid_init || !e.sid_write || !e.sid_render || !e.sid_pcm_ptr ||
      !e.sid_reset) throw new Error('Missing required reSIDfp WASM exports');
  if (e.sid_init(model, sampleRate) !== 1) throw new Error('reSIDfp initialization failed');
  const cyclesPerSecond = clock === 'PAL' ? PAL_CLOCK : NTSC_CLOCK;
  return {
    render(events, { endCycle, chip = 0, voice = null } = {}) {
      const trace = validateSidEvents(events);
      const lastCycle = trace.at(-1)?.cycle ?? 0;
      const durationCycles = endCycle ?? lastCycle;
      if (!Number.isSafeInteger(durationCycles) || durationCycles < lastCycle) {
        throw new RangeError('Invalid end cycle');
      }
      if (!Number.isInteger(chip) || chip < 0 || chip > 3 ||
          (voice !== null && (![1, 2, 3].includes(voice)))) {
        throw new RangeError('Invalid chip or voice');
      }
      if (trace.some(event => event.chip > 2)) throw new RangeError('Unsupported SID chip index');
      const totalFrames = Math.ceil(durationCycles * sampleRate / cyclesPerSecond);
      if (totalFrames > MAX_FRAMES) throw new RangeError('Offline render exceeds 60-second frame budget');
      e.sid_reset();
      // sid_reset() clears the default volume written during sid_init().
      // Restore maximum master volume for chips used in offline rendering.
      for (let i = 0; i < 4; i++) e.sid_write(i * 32 + 24, 15);
      const pcm = new Int16Array(totalFrames);
      let frame = 0;
      let index = 0;
      const renderUntil = target => {
        while (frame < target) {
          const count = Math.min(4096, target - frame);
          if (e.sid_render(count) !== count) throw new Error('reSIDfp rendering failed');
          const ptr = e.sid_pcm_ptr();
          const view = new Int16Array(e.memory.buffer, ptr, count * 2);
          // Existing bridge returns interleaved stereo. Average into mono.
          for (let i = 0; i < count; i++) {
            pcm[frame + i] = Math.round((view[i * 2] + view[i * 2 + 1]) / 2);
          }
          frame += count;
        }
      };
      while (index < trace.length) {
        const cycle = trace[index].cycle;
        const target = Math.min(totalFrames, Math.round(cycle * sampleRate / cyclesPerSecond));
        renderUntil(target);
        while (index < trace.length && trace[index].cycle === cycle) {
          const event = trace[index++];
          if (event.chip !== chip) continue;
          const voiceIndex = Math.floor(event.register / 7) + 1;
          const isVoiceRegister = event.register <= 20;
          if (voice !== null && isVoiceRegister && voiceIndex !== voice) continue;
          if (event.register <= 24) e.sid_write(chip * 32 + event.register, event.value);
        }
      }
      renderUntil(totalFrames);
      return { pcm, sampleRate, clock, timing: 'sample-quantized', chip, voice };
    },
  };
}
