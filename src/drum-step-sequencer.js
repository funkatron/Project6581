import {validatePitchEnvelope} from './pitch-envelope.js?v=__BUILD_ID__';

/** Four-lane × sixteen-step drum grid. No DOM or WASM dependencies. */

export const DRUM_LANE_IDS = Object.freeze(['kick', 'sn', 'ch', 'oh']);

/** Legacy presets and grooves used six rows (kick … tom). */
export const LEGACY_DRUM_LANE_COUNT = 6;

export const DRUM_STEP_COUNT = 16;
export const DRUM_LANE_COUNT = DRUM_LANE_IDS.length;

export const DRUM_BOOST_DB = Object.freeze([0, 6, 12, 18, 24]);

export const DRUM_PITCH_OFFSET_SEMITONES = Object.freeze([-48, -36, -24, -12, 0, 12, 24, 36, 48]);

const DEFAULT_LEVELS = Object.freeze({
  kick: 100,
  sn: 70,
  ch: 20,
  oh: 20,
});

const noPitchEnvelope = () => ({ enabled: false, interpolation: 'linear', end: 'zero', points: [{ ms: 0, semitones: 0 }] });

/** Factory kit: owner's audition settings (2026-11-24 export and screenshots). */
export function defaultDrumKit() {
  const lanes = {
    kick: {
      presetId: 'low-thud-kick', midiNote: 36, level: DEFAULT_LEVELS.kick, pitchOffsetSemitones: 48,
      voice: { decay: 0, sustain: 0, pitchEnvelope: noPitchEnvelope() },
    },
    sn: {
      presetId: 'noise-snare', midiNote: 38, level: DEFAULT_LEVELS.sn, pitchOffsetSemitones: 48,
      voice: { decay: 0.16, sustain: 0, pitchEnvelope: noPitchEnvelope() },
    },
    ch: { presetId: 'closed-noise-hat', midiNote: 42, level: DEFAULT_LEVELS.ch, pitchOffsetSemitones: 36, voice: { decay: 0.07 } },
    oh: { presetId: 'open-noise-hat', midiNote: 46, level: DEFAULT_LEVELS.oh, pitchOffsetSemitones: 36 },
  };
  return { name: 'Factory 6581', lanes };
}

/** Factory groove (all four lanes); steps are 1-based in the comments. */
export function defaultFactoryDrumGrid() {
  const row = (...steps) => Array.from({ length: DRUM_STEP_COUNT }, (_, i) => steps.includes(i + 1));
  return [
    row(1, 2, 3, 9, 13, 16), // kick
    row(5, 12), // sn
    row(1, 2, 4, 5, 6, 8, 9, 10, 13, 14, 16), // closed hat
    row(3, 7, 11, 15), // open hat
  ];
}

export function defaultDrumSequence() {
  return {
    enabled: false,
    rate: 4,
    sync: true,
    localBpm: 120,
    steps: DRUM_STEP_COUNT,
    grid: defaultFactoryDrumGrid(),
  };
}

function validateLane(lane, id) {
  if (!lane || typeof lane !== 'object' || Array.isArray(lane)) {
    throw new TypeError('Drum lane ' + id + ' must be an object');
  }
  if (typeof lane.presetId !== 'string' || !lane.presetId.trim()) {
    throw new TypeError('Drum lane ' + id + ' presetId must be text');
  }
  if (!Number.isInteger(lane.midiNote) || lane.midiNote < 0 || lane.midiNote > 127) {
    throw new RangeError('Drum lane ' + id + ' midiNote must be 0–127');
  }
  const level = lane.level === undefined ? DEFAULT_LEVELS[id] ?? 80 : lane.level;
  if (!Number.isInteger(level) || level < 0 || level > 100) {
    throw new RangeError('Drum lane ' + id + ' level must be 0–100');
  }
  let pitchOffsetSemitones = 0;
  if (id === 'ch' || id === 'oh') pitchOffsetSemitones = 48;
  if (lane.pitchOffsetSemitones !== undefined) {
    pitchOffsetSemitones = validateLanePitchOffset(lane.pitchOffsetSemitones, id);
  }
  const out = {presetId: lane.presetId.trim(), midiNote: lane.midiNote, level, pitchOffsetSemitones};
  if (lane.voice !== undefined) out.voice = validateLaneVoicePatch(lane.voice, id);
  if (lane.filter !== undefined) out.filter = validateLaneFilterPatch(lane.filter, id);
  return out;
}

export function validateLanePitchOffset(value, laneId = 'lane') {
  const semitones = Number(value);
  if (!Number.isInteger(semitones) || !DRUM_PITCH_OFFSET_SEMITONES.includes(semitones)) {
    throw new RangeError(
      'Drum lane ' + laneId + ' pitchOffsetSemitones must be one of ' + DRUM_PITCH_OFFSET_SEMITONES.join(', '),
    );
  }
  return semitones;
}

function validateLaneVoicePatch(patch, id) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new TypeError('Drum lane ' + id + ' voice patch must be an object');
  }
  const out = {};
  for (const key of ['attack', 'decay', 'sustain', 'release', 'pulse', 'pwmDepth', 'pwmRate']) {
    if (patch[key] === undefined) continue;
    const value = Number(patch[key]);
    if (!Number.isFinite(value)) throw new TypeError('Drum lane ' + id + ' voice.' + key + ' must be a number');
    out[key] = value;
  }
  if (patch.pitchEnvelope !== undefined) {
    out.pitchEnvelope = validatePitchEnvelope(patch.pitchEnvelope);
  }
  return out;
}

function validateLaneFilterPatch(patch, id) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new TypeError('Drum lane ' + id + ' filter patch must be an object');
  }
  const out = {};
  if (patch.cutoff !== undefined) {
    const cutoff = Number(patch.cutoff);
    if (!Number.isFinite(cutoff) || cutoff < 50 || cutoff > 10000) {
      throw new RangeError('Drum lane ' + id + ' filter.cutoff must be 50–10000');
    }
    out.cutoff = Math.round(cutoff);
  }
  if (patch.resonance !== undefined) {
    const resonance = Number(patch.resonance);
    if (!Number.isFinite(resonance) || resonance < 0 || resonance > 100) {
      throw new RangeError('Drum lane ' + id + ' filter.resonance must be 0–100');
    }
    out.resonance = Math.round(resonance);
  }
  if (patch.mode !== undefined) {
    if (!['lowpass', 'bandpass', 'highpass'].includes(patch.mode)) {
      throw new RangeError('Drum lane ' + id + ' filter.mode is invalid');
    }
    out.mode = patch.mode;
  }
  return out;
}

export function validateDrumKit(kit) {
  if (!kit || typeof kit !== 'object' || Array.isArray(kit)) {
    throw new TypeError('Drum kit must be an object');
  }
  const name = typeof kit.name === 'string' && kit.name.trim() ? kit.name.trim() : 'Drum kit';
  const lanes = object(kit.lanes, 'lanes');
  const out = {};
  for (const id of DRUM_LANE_IDS) {
    out[id] = validateLane(lanes[id], id);
  }
  return { name, lanes: out };
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(label + ' must be an object');
  }
  return value;
}

export function validateDrumSequence(sequence) {
  if (!sequence || typeof sequence !== 'object' || Array.isArray(sequence)) {
    throw new TypeError('Drum sequence must be an object');
  }
  const enabled = Boolean(sequence.enabled);
  const rate = Number(sequence.rate);
  if (!Number.isFinite(rate) || rate < 0.25 || rate > 32) {
    throw new RangeError('Drum rate must be a valid division');
  }
  const sync = Boolean(sequence.sync);
  const localBpm = Math.round(Number(sequence.localBpm) || 120);
  if (localBpm < 40 || localBpm > 240) {
    throw new RangeError('Drum local BPM must be 40–240');
  }
  const steps = DRUM_STEP_COUNT;
  const grid = coalesceDrumGrid(sequence.grid).map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== steps) {
      throw new RangeError('Drum row ' + (rowIndex + 1) + ' must have ' + steps + ' steps');
    }
    return row.map((cell, col) => {
      if (typeof cell !== 'boolean') {
        throw new TypeError('Drum cell row ' + (rowIndex + 1) + ' col ' + (col + 1) + ' must be boolean');
      }
      return cell;
    });
  });
  return { enabled, rate, sync, localBpm, steps, grid };
}

function emptyDrumRow() {
  return Array.from({length: DRUM_STEP_COUNT}, () => false);
}

function normalizeDrumRow(row) {
  if (!Array.isArray(row)) {
    return emptyDrumRow();
  }
  return Array.from({length: DRUM_STEP_COUNT}, (_, col) => Boolean(row[col]));
}

/**
 * Normalize any saved grid to four rows × sixteen steps (legacy six-row grids lose clap/tom).
 * Short or malformed rows pad with rests instead of failing studio startup.
 */
export function coalesceDrumGrid(grid) {
  if (!Array.isArray(grid)) {
    return DRUM_LANE_IDS.map(() => emptyDrumRow());
  }
  const source = grid.length >= DRUM_LANE_COUNT ? grid.slice(0, DRUM_LANE_COUNT) : [...grid];
  while (source.length < DRUM_LANE_COUNT) {
    source.push(emptyDrumRow());
  }
  return source.map((row) => normalizeDrumRow(row));
}

/** Lane index 0–3 for row; step index 0–15. */
export function hitsOnStep(sequence, stepIndex) {
  const index = stepIndex % DRUM_STEP_COUNT;
  const hits = [];
  sequence.grid.forEach((row, laneIndex) => {
    if (row[index]) hits.push({ lane: DRUM_LANE_IDS[laneIndex], laneIndex });
  });
  return hits;
}

export function validateDrumEngineBoost(db) {
  const value = db === undefined ? 24 : Number(db);
  if (!DRUM_BOOST_DB.includes(value)) {
    throw new RangeError('Drum outputBoostDb must be one of ' + DRUM_BOOST_DB.join(', '));
  }
  return value;
}