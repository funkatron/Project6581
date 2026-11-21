#!/usr/bin/env node
/**
 * SID Instrument Lab playback feasibility probe.
 *
 * Requires separately installed libsidplayfp-wasm. This probe proves 6510
 * execution and PCM output; getSidStatus() is a snapshot, NOT a write trace.
 *
 * Usage: node scripts/sid-lab-playback-probe.mjs tune.sid [--subtune N] [--seconds N]
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function probeSidPlayback(bytes, {
  subtune, seconds = 2, engineFactory,
} = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected SID bytes');
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 10) {
    throw new RangeError('Probe duration must be 1..10 seconds');
  }
  if (subtune !== undefined && (!Number.isInteger(subtune) || subtune < 1)) {
    throw new RangeError('Subtune must be a positive one-based number');
  }
  const factory = engineFactory ?? (async () => {
    const { SidAudioEngine } = await import('libsidplayfp-wasm');
    return new SidAudioEngine({ engine: 'residfp' });
  });
  const engine = await factory();
  try {
    await engine.loadSidBuffer(bytes);
    const info = engine.getTuneInfo();
    if (subtune !== undefined) {
      if (Number.isInteger(info?.songs) && subtune > info.songs) {
        throw new RangeError('Subtune exceeds song count');
      }
      await engine.selectSong(subtune - 1); // library uses zero-based subtunes
    }
    const pcm = await engine.renderSeconds(seconds);
    if (!(pcm instanceof Int16Array) || pcm.length < 2 || pcm.length % 2) {
      throw new Error('Playback engine returned invalid interleaved stereo PCM');
    }
    const peak = pcm.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
    const chips = engine.getInstalledSids();
    const status = Array.from({ length: chips }, (_, chip) =>
      Array.from(engine.getSidStatus(chip)));
    return {
      info, subtune: subtune ?? null, seconds, samples: pcm.length,
      peak, nonSilent: peak > 0, installedSids: chips,
      finalRegisterSnapshots: status,
      captureSupported: false,
      note: 'Register snapshots are not cycle-timestamped write events.',
    };
  } finally {
    engine.dispose();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, ...options] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < options.length; i++) {
    const flag = options[i];
    const value = options[++i];
    if (!['--subtune', '--seconds'].includes(flag) || !/^[0-9]+$/.test(value ?? '')) {
      console.error('Usage: sid-lab-playback-probe tune.sid [--subtune N] [--seconds N]');
      process.exit(2);
    }
    opts[flag.slice(2)] = Number(value);
  }
  if (!file) {
    console.error('Usage: sid-lab-playback-probe tune.sid [--subtune N] [--seconds N]');
    process.exit(2);
  }
  probeSidPlayback(new Uint8Array(await readFile(file)), opts)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
