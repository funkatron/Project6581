/**
 * Analyze timestamped SID register writes without coupling to audio playback.
 *
 * Event shape: { cycle: nonnegative integer, chip: nonnegative integer,
 *                register: 0..31, value: 0..255 }.
 * The 25 classic SID registers are 0..24; higher addresses are ignored by
 * the voice summarizer, but retained in the event trace.
 */
const VOICE_BASES = [0, 7, 14];
const VOICE_REGISTERS = 7;
const FILTER_START = 21;
const FILTER_END = 24;

export function validateSidEvents(events) {
  if (!Array.isArray(events)) throw new TypeError('Expected SID register event array');
  let previousCycle = -1;
  return events.map((event, index) => {
    if (!event || !Number.isSafeInteger(event.cycle) || event.cycle < 0 ||
        !Number.isSafeInteger(event.chip) || event.chip < 0 || event.chip > 2 ||
        !Number.isInteger(event.register) || event.register < 0 || event.register > 31 ||
        !Number.isInteger(event.value) || event.value < 0 || event.value > 255) {
      throw new RangeError(`Invalid SID event at index ${index}`);
    }
    if (event.cycle < previousCycle) throw new RangeError('SID events must be cycle-ordered');
    previousCycle = event.cycle;
    return Object.freeze({
      cycle: event.cycle, chip: event.chip,
      register: event.register, value: event.value,
    });
  });
}

export function analyzeSidRegisterEvents(events) {
  const trace = validateSidEvents(events);
  const voices = new Map();
  const filters = new Map();
  for (const event of trace) {
    const { chip, register, value, cycle } = event;
    if (register >= FILTER_START && register <= FILTER_END) {
      if (!filters.has(chip)) filters.set(chip, []);
      filters.get(chip).push(event);
      continue;
    }
    const voiceIndex = VOICE_BASES.findIndex(base =>
      register >= base && register < base + VOICE_REGISTERS);
    if (voiceIndex < 0) continue;
    const key = `${chip}:${voiceIndex}`;
    if (!voices.has(key)) {
      voices.set(key, {
        chip, voice: voiceIndex + 1, events: [],
        noteOns: [], noteOffs: [], waveformChanges: [],
      });
    }
    const voice = voices.get(key);
    const offset = register - VOICE_BASES[voiceIndex];
    const previous = voice._control ?? 0;
    voice.events.push(event);
    if (offset === 4) {
      const oldGate = (previous & 1) !== 0;
      const newGate = (value & 1) !== 0;
      if (!oldGate && newGate) voice.noteOns.push(cycle);
      if (oldGate && !newGate) voice.noteOffs.push(cycle);
      if ((previous & 0xf0) !== (value & 0xf0)) {
        voice.waveformChanges.push({ cycle, waveformBits: value & 0xf0 });
      }
      voice._control = value;
    }
  }
  return Object.freeze({
    eventCount: trace.length,
    voices: [...voices.values()].map(({ _control, ...voice }) => voice),
    filters: [...filters.entries()].map(([chip, events]) => ({ chip, events })),
  });
}
