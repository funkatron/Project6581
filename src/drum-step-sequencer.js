import {validatePitchEnvelope} from './pitch-envelope.js';

/** Four-lane × sixteen-step drum grid. No DOM or WASM dependencies. */

export const DRUM_LANE_IDS = Object.freeze(['kick', 'sn', 'ch', 'oh']);

/** Legacy presets and grooves used six rows (kick … tom). */
export const LEGACY_DRUM_LANE_COUNT = 6;

export const DRUM_STEP_COUNT = 16;
export const DRUM_LANE_COUNT = DRUM_LANE_IDS.length;

export const DRUM_BOOST_DB = Object.freeze([0, 6, 12]);

const DEFAULT_LEVELS = Object.freeze({
  kick: 100,
  sn: 92,
  ch: 70,
  oh: 72,
});

export function defaultDrumKit() {
  const lanes = {
    kick: { presetId: 'low-thud-kick', midiNote: 36, level: DEFAULT_LEVELS.kick },
    sn: { presetId: 'noise-snare', midiNote: 38, level: DEFAULT_LEVELS.sn },
    ch: { presetId: 'closed-noise-hat', midiNote: 42, level: DEFAULT_LEVELS.ch },
    oh: { presetId: 'open-noise-hat', midiNote: 46, level: DEFAULT_LEVELS.oh },
  };
  return { name: 'Factory 6581', lanes };
}

export function defaultDrumSequence() {
  return {
    enabled: false,
    rate: 4,
    sync: true,
    localBpm: 120,
    steps: DRUM_STEP_COUNT,
    grid: DRUM_LANE_IDS.map(() =>
      Array.from({ length: DRUM_STEP_COUNT }, () => false),
    ),
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
  const out = {presetId: lane.presetId.trim(), midiNote: lane.midiNote, level};
  if (lane.voice !== undefined) out.voice = validateLaneVoicePatch(lane.voice, id);
  if (lane.filter !== undefined) out.filter = validateLaneFilterPatch(lane.filter, id);
  return out;
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

/** Trim a legacy 6-row grid to the four shipped lanes (drops clap/tom rows). */
export function coalesceDrumGrid(grid) {
  if (!Array.isArray(grid)) {
    throw new TypeError('Drum grid must be an array');
  }
  if (grid.length === DRUM_LANE_COUNT) {
    return grid;
  }
  if (grid.length === LEGACY_DRUM_LANE_COUNT) {
    return grid.slice(0, DRUM_LANE_COUNT);
  }
  throw new RangeError('Drum grid must have ' + DRUM_LANE_COUNT + ' or legacy ' + LEGACY_DRUM_LANE_COUNT + ' rows');
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
  const value = db === undefined ? 6 : Number(db);
  if (!DRUM_BOOST_DB.includes(value)) {
    throw new RangeError('Drum outputBoostDb must be 0, 6, or 12');
  }
  return value;
}