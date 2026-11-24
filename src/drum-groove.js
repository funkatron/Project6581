import {cleanPresetName, validateDrumEngineSlice, validateDrumLfo} from './preset-library.js?v=__BUILD_ID__';
import {
  defaultDrumKit,
  defaultDrumSequence,
  validateDrumEngineBoost,
  validateDrumKit,
  validateDrumSequence,
} from './drum-step-sequencer.js?v=__BUILD_ID__';

export const DRUM_GROOVE_FORMAT = '6581drum';
export const DRUM_GROOVE_VERSION = 1;

function object(v, name) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new TypeError(name + ' must be an object');
  return v;
}

function validateOptionalDrumLfo(lfo) {
  if (lfo === undefined || lfo === null) return null;
  return validateDrumLfo(lfo);
}

/** Validate standalone groove file (pattern + kit + optional SID 4 slice). */
export function validateDrumGroove(value) {
  const root = object(value, 'groove');
  const format = root.format;
  if (format !== DRUM_GROOVE_FORMAT) throw new RangeError('Groove format must be ' + DRUM_GROOVE_FORMAT);
  const version = Number(root.version);
  if (version !== DRUM_GROOVE_VERSION) throw new RangeError('Unsupported groove version');
  const name = cleanPresetName(root.name ?? 'Drum groove');
  const drumSequence = validateDrumSequence(root.drumSequence ?? defaultDrumSequence());
  const drumKit = validateDrumKit(root.drumKit ?? defaultDrumKit());
  let drumEngine = null;
  if (root.drumEngine !== undefined && root.drumEngine !== null) {
    drumEngine = validateDrumEngineSlice({
      ...object(root.drumEngine, 'drumEngine'),
      outputBoostDb: validateDrumEngineBoost(root.drumEngine.outputBoostDb),
    });
  }
  const drumLfo = validateOptionalDrumLfo(root.drumLfo);
  return {format: DRUM_GROOVE_FORMAT, version: DRUM_GROOVE_VERSION, name, drumSequence, drumKit, drumEngine, drumLfo};
}

export function buildDrumGroove({name, drumSequence, drumKit, drumEngine, drumLfo}) {
  return validateDrumGroove({
    format: DRUM_GROOVE_FORMAT,
    version: DRUM_GROOVE_VERSION,
    name: name ?? drumKit?.name ?? 'Drum groove',
    drumSequence,
    drumKit,
    drumEngine,
    drumLfo,
  });
}

export function serializeDrumGroove(groove) {
  const v = validateDrumGroove(groove);
  const out = {
    format: v.format,
    version: v.version,
    name: v.name,
    drumSequence: v.drumSequence,
    drumKit: v.drumKit,
  };
  if (v.drumEngine) out.drumEngine = v.drumEngine;
  if (v.drumLfo) out.drumLfo = v.drumLfo;
  return JSON.stringify(out, null, 2);
}

export function parseDrumGrooveText(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SyntaxError('Groove file is not valid JSON');
  }
  return validateDrumGroove(raw);
}