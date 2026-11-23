import {voiceWaveLabel} from './sid-waveform.js?v=0.20.2+20261123T193714181Z';

/** Which drum-bus UI blocks apply for a factory/effective voice wave. */
export function drumBusShowsPulse(wave) {
  const text = String(wave ?? '');
  return text === 'square' || text.split('+').includes('square');
}

export function drumBusShowsPitchEnvelope(voice) {
  if (!voice?.pitchEnvelope) return false;
  if (voice.pitchEnvelope.enabled) return true;
  const wave = String(voice.wave ?? '');
  if (wave.includes('triangle') || wave.includes('sawtooth') || wave.includes('square')) return true;
  return wave === 'triangle' || wave === 'sawtooth' || wave === 'square';
}

export function drumBusWaveLabel(wave) {
  try {
    return voiceWaveLabel(wave);
  } catch {
    return String(wave ?? 'Voice');
  }
}

export const DRUM_VOICE_ADSR_FIELDS = Object.freeze([
  ['attack', 'Attack', 0, 2, 0.01],
  ['decay', 'Decay', 0, 3, 0.01],
  ['sustain', 'Sustain', 0, 1, 0.01],
  ['release', 'Release', 0.01, 4, 0.01],
]);

export const DRUM_VOICE_PULSE_FIELDS = Object.freeze([
  ['pulse', 'Pulse width', 5, 95, 1],
  ['pwmDepth', 'PWM depth', 0, 45, 1],
  ['pwmRate', 'PWM rate (Hz)', 0.1, 12, 0.1],
]);

/** Representative kit lane per physical SID 4 voice bus. */
export const DRUM_BUS_LANES = Object.freeze([
  {slot: 0, title: 'Kick bus', laneId: 'kick', helpId: 'drum-bus-kick'},
  {slot: 1, title: 'Snare bus', laneId: 'sn', helpId: 'drum-bus-sn'},
  {slot: 2, title: 'Hat bus', laneId: 'ch', helpId: 'drum-bus-hat'},
]);

export function drumFactoryPresetOptions(presets) {
  return (presets ?? []).filter(preset => preset?.category === 'Drums');
}

export function drumLfoTargetsForKit(resolvedWaves) {
  const waves = resolvedWaves ?? [];
  const hasPulse = waves.some(wave => drumBusShowsPulse(wave));
  const base = ['cutoff', 'resonance', 'volume', 'pan', 'attack', 'decay', 'sustain', 'release'];
  if (hasPulse) return [...base, 'pulse'];
  return base;
}