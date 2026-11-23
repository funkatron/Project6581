/** 6581 voice control register waveform bits (OR together). */
export const WAVE_BITS = Object.freeze({
  triangle: 0x10,
  sawtooth: 0x20,
  pulse: 0x40,
  square: 0x40,
  noise: 0x80,
});

const BASE_WAVES = ['triangle', 'sawtooth', 'square', 'noise'];

export function isBaseWave(part) {
  return BASE_WAVES.includes(part);
}

/** `"triangle+noise"` or `["triangle","noise"]` → control byte (without gate). */
export function waveControlByte(waveSpec) {
  if (waveSpec === undefined || waveSpec === null) return WAVE_BITS.triangle;
  if (Array.isArray(waveSpec)) {
    let mask = 0;
    for (const part of waveSpec) {
      const bit = WAVE_BITS[part];
      if (!bit) throw new RangeError('Unknown waveform part: ' + part);
      mask |= bit;
    }
    if (!mask) throw new RangeError('Waveform mask is empty');
    return mask;
  }
  const text = String(waveSpec).trim();
  if (BASE_WAVES.includes(text)) return WAVE_BITS[text] ?? WAVE_BITS.triangle;
  const parts = text.split('+').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return WAVE_BITS.triangle;
  let mask = 0;
  for (const part of parts) {
    const bit = WAVE_BITS[part];
    if (!bit) throw new RangeError('Unknown waveform part: ' + part);
    mask |= bit;
  }
  return mask;
}

export function validateVoiceWave(wave) {
  waveControlByte(wave);
  if (Array.isArray(wave)) return wave.join('+');
  return String(wave).trim();
}

export function voiceWaveLabel(wave) {
  const text = validateVoiceWave(wave);
  if (!text.includes('+')) {
    if (text === 'square') return 'Pulse';
    if (text === 'triangle') return 'Triangle';
    if (text === 'sawtooth') return 'Sawtooth';
    if (text === 'noise') return 'Noise';
    return text;
  }
  return text
    .split('+')
    .map((part) => {
      if (part === 'square') return 'Pulse';
      if (part === 'triangle') return 'Tri';
      if (part === 'sawtooth') return 'Saw';
      if (part === 'noise') return 'Noise';
      return part;
    })
    .join(' + ');
}