/**
 * QA gates for offline listening WAVs (mono 16-bit from encodeWav).
 */
export function verifyListeningKickWav(wavBytes, {
  sampleRate = 48000,
  preRollMs = 200,
  minHits = 4,
  maxPreRollPeakInt16 = 400,
  minHitPeakInt16 = 1200,
} = {}) {
  const view = new DataView(
    wavBytes.buffer ?? wavBytes,
    wavBytes.byteOffset ?? 0,
    wavBytes.byteLength ?? wavBytes.length,
  );
  const tag = (o, l) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + o, l));
  if (tag(0, 4) !== 'RIFF' || tag(8, 4) !== 'WAVE') throw new TypeError('Not a PCM WAV');
  const sr = view.getUint32(24, true);
  if (sr !== sampleRate) throw new RangeError('Expected ' + sampleRate + ' Hz, got ' + sr);
  const frames = (view.byteLength - 44) / 2;
  const read = (i) => view.getInt16(44 + i * 2, true);

  const preEnd = Math.floor((preRollMs / 1000) * sr);
  let prePeak = 0;
  for (let i = 0; i < preEnd && i < frames; i++) {
    prePeak = Math.max(prePeak, Math.abs(read(i)));
  }

  const searchFrom = preEnd;
  const minGap = Math.floor(0.18 * sr);
  const hits = [];
  let i = searchFrom;
  while (i < frames) {
    const a = Math.abs(read(i));
    if (a >= minHitPeakInt16) {
      let peak = a;
      let peakAt = i;
      let j = i;
      const windowEnd = Math.min(frames, i + Math.floor(0.45 * sr));
      while (j < windowEnd) {
        const b = Math.abs(read(j));
        if (b > peak) {
          peak = b;
          peakAt = j;
        }
        j++;
      }
      const lastAt = hits.length ? hits[hits.length - 1].at : -minGap;
      if (peakAt - lastAt >= minGap) {
        hits.push({at: peakAt, peak, atMs: (peakAt / sr) * 1000});
      }
      i = windowEnd;
      continue;
    }
    i++;
  }

  const failures = [];
  if (prePeak > maxPreRollPeakInt16) {
    failures.push('pre-roll too loud (peak ' + prePeak + ', max ' + maxPreRollPeakInt16 + ')');
  }
  if (hits.length < minHits) {
    failures.push('expected ' + minHits + ' kicks, found ' + hits.length);
  }
  if (failures.length) {
    throw new Error('WAV verify failed: ' + failures.join('; '));
  }
  return {prePeak, hits, durationSec: frames / sr};
}