/** Six-lane × sixteen-step drum grid. No DOM or WASM dependencies. */

export const DRUM_LANE_IDS = Object.freeze([
  'kick',
  'sn',
  'ch',
  'oh',
  'clap',
  'tom',
]);

export const DRUM_STEP_COUNT = 16;
export const DRUM_LANE_COUNT = DRUM_LANE_IDS.length;

export const DRUM_BOOST_DB = Object.freeze([0, 6, 12]);

const DEFAULT_LEVELS = Object.freeze({
  kick: 100,
  sn: 92,
  ch: 70,
  oh: 72,
  clap: 75,
  tom: 80,
});

export function defaultDrumKit() {
  const lanes = {
    kick: { presetId: 'low-thud-kick', midiNote: 36, level: DEFAULT_LEVELS.kick },
    sn: { presetId: 'noise-snare', midiNote: 38, level: DEFAULT_LEVELS.sn },
    ch: { presetId: 'closed-noise-hat', midiNote: 42, level: DEFAULT_LEVELS.ch },
    oh: { presetId: 'open-noise-hat', midiNote: 46, level: DEFAULT_LEVELS.oh },
    clap: { presetId: 'noise-clap', midiNote: 39, level: DEFAULT_LEVELS.clap },
    tom: { presetId: 'low-tom', midiNote: 45, level: DEFAULT_LEVELS.tom },
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
  return { presetId: lane.presetId.trim(), midiNote: lane.midiNote, level };
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
  if (!Array.isArray(sequence.grid) || sequence.grid.length !== DRUM_LANE_COUNT) {
    throw new RangeError('Drum grid must have ' + DRUM_LANE_COUNT + ' rows');
  }
  const grid = sequence.grid.map((row, rowIndex) => {
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

/** Lane index 0–5 for row; step index 0–15. */
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