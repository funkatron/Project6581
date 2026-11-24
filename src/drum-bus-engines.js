const MODES = ['lowpass', 'bandpass', 'highpass'];

/** Filter defaults for SID 4 kick, SID 5 snare, and SID 6 cymbals. Each bus is its own chip. */
export const DRUM_BUS_COUNT = 3;

export const DRUM_BUS_TITLES = Object.freeze(['Kick bus', 'Snare bus', 'Hat bus']);

const defaultFilter = (cutoff, resonance, volume, mode) => ({
  cutoff,
  resonance,
  volume,
  mode,
});

export function defaultDrumBusEngines() {
  return [
    {filter: defaultFilter(2583, 100, 100, 'lowpass')},
    {filter: defaultFilter(1273, 93, 73, 'bandpass')},
    {filter: defaultFilter(5958, 23, 100, 'highpass')},
  ];
}

export function drumBusIndexForLane(laneId) {
  if (laneId === 'kick') return 0;
  if (laneId === 'sn') return 1;
  return 2;
}

function validateBusFilter(filter, fallback) {
  const f = filter && typeof filter === 'object' && !Array.isArray(filter) ? filter : {};
  const cutoff = Number(f.cutoff ?? fallback.cutoff);
  const resonance = Number(f.resonance ?? fallback.resonance);
  const volume = Number(f.volume ?? fallback.volume);
  const mode = MODES.includes(f.mode) ? f.mode : fallback.mode;
  return {
    cutoff: Math.max(50, Math.min(10000, cutoff)),
    resonance: Math.max(0, Math.min(100, resonance)),
    volume: Math.max(0, Math.min(100, volume)),
    mode,
  };
}

export function validateDrumBusEngines(value) {
  const defaults = defaultDrumBusEngines();
  if (!Array.isArray(value)) return defaults.map(bus => ({filter: {...bus.filter}}));
  const out = [];
  for (let i = 0; i < DRUM_BUS_COUNT; i++) {
    const row = value[i];
    const base = defaults[i] ?? defaults[0];
    out.push({
      filter: validateBusFilter(row?.filter, base.filter),
    });
  }
  return out;
}