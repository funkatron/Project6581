/**
 * QA gates for offline listening WAVs (mono 16-bit from encodeWav).
 */
export function verifyListeningKickWav(wavBytes, {
  sampleRate = 48000,
  preRollMs = 200,
  minHits = 4,
  maxPreRollPeakInt16 = 400,
  minHitPeakInt16 = 600,
  minHitZeroCrossings = 8,
  minHitBipolarSamples = 40,
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

  const windowSamples = Math.floor(0.14 * sr);
  const step = Math.floor(0.04 * sr);
  const minGap = Math.floor(0.35 * sr);
  const candidates = [];
  for (let start = preEnd; start + windowSamples < frames; start += step) {
    let peak = 0;
    let pos = 0;
    let neg = 0;
    let zc = 0;
    let prev = read(start);
    for (let i = start; i < start + windowSamples; i++) {
      const x = read(i);
      const a = Math.abs(x);
      if (a > peak) peak = a;
      if (x > 0) pos++;
      if (x < 0) neg++;
      if (i > start && (prev >= 0) !== (x >= 0)) zc++;
      prev = x;
    }
    if (peak >= minHitPeakInt16 && zc >= minHitZeroCrossings && pos >= minHitBipolarSamples && neg >= minHitBipolarSamples) {
      candidates.push({at: start + Math.floor(windowSamples / 2), peak, zc, atMs: ((start + windowSamples / 2) / sr) * 1000});
    }
  }
  candidates.sort((a, b) => a.at - b.at);
  const hits = [];
  for (const cand of candidates) {
    const lastAt = hits.length ? hits[hits.length - 1].at : -minGap;
    if (cand.at - lastAt >= minGap) {
      hits.push({at: cand.at, peak: cand.peak, atMs: cand.atMs});
    }
  }

  const failures = [];
  if (prePeak > maxPreRollPeakInt16) {
    failures.push('pre-roll too loud (peak ' + prePeak + ', max ' + maxPreRollPeakInt16 + ')');
  }
  if (hits.length < minHits) {
    failures.push('expected ' + minHits + ' tonal hits, found ' + hits.length);
  }
  if (failures.length) {
    throw new Error('WAV verify failed: ' + failures.join('; '));
  }
  return {prePeak, hits, durationSec: frames / sr};
}