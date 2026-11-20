import {DRUM_LANE_IDS} from './drum-step-sequencer.js';

export function drumOwnerKey(laneId) {
  if (!DRUM_LANE_IDS.includes(laneId)) throw new RangeError('Unknown drum lane: ' + laneId);
  return 'drum:' + laneId;
}

export function isDrumOwner(ownerKey) {
  return typeof ownerKey === 'string' && ownerKey.startsWith('drum:');
}

/** Factory preset voice (+ legacy filter snapshot). Lane level shapes loudness via sustain (shared bus filter). */
export function drumLaneTimbre(factorySettings, lane) {
  if (!factorySettings?.sound?.engines?.[0]) {
    throw new TypeError('Factory preset missing engine voice');
  }
  const source = factorySettings.sound.engines[0];
  const level = Math.max(0, Math.min(100, Math.round(Number(lane.level) || 0)));
  const voice = structuredClone(source.voice);
  const filter = structuredClone(source.filter);
  if (lane.voice && typeof lane.voice === 'object') {
    Object.assign(voice, lane.voice);
    if (lane.voice.pitchEnvelope) {
      voice.pitchEnvelope = {...voice.pitchEnvelope, ...lane.voice.pitchEnvelope};
    }
  }
  if (lane.filter && typeof lane.filter === 'object') {
    Object.assign(filter, lane.filter);
  }
  const levelGain = level / 100;
  if (levelGain < 1 && Number.isFinite(voice.sustain)) {
    voice.sustain = Math.max(0, Math.min(1, voice.sustain * levelGain));
  }
  if (levelGain < 1 && voice.wave === 'noise' && Number.isFinite(voice.decay)) {
    voice.decay = Math.max(0.005, voice.decay * (0.65 + 0.35 * levelGain));
  }
  filter.volume = Math.round((Number(filter.volume) || 0) * levelGain);
  return {voice, filter};
}

/** Approximate one-shot length in ms for scheduling noteOff (seconds-based ADSR). */
export function drumReleaseMilliseconds(voice) {
  const attack = Number(voice?.attack) || 0;
  const decay = Number(voice?.decay) || 0.1;
  const release = Number(voice?.release) || 0.05;
  const envelopeMs = (attack + decay + release) * 1000;
  const pe = voice?.pitchEnvelope;
  let peMs = 0;
  if (pe?.enabled) {
    peMs =
      ((Number(pe.attack) || 0) + (Number(pe.decay) || 0) + (Number(pe.sustain) || 0)) * 1000;
  }
  return Math.max(80, Math.ceil(Math.max(envelopeMs, peMs, 120)));
}

export function drumBpm(sequence, masterBpm) {
  const sync = sequence.sync !== false;
  const local = Math.round(Number(sequence.localBpm) || 120);
  const master = Math.round(Number(masterBpm) || 120);
  const bpm = sync ? master : local;
  if (bpm < 40 || bpm > 240) throw new RangeError('Drum BPM out of range');
  return bpm;
}