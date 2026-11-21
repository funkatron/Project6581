/**
 * Extract candidate note intervals from captured SID register writes.
 * This is a structural analysis, not audio transcription. It preserves the
 * complete per-voice register state at gate-on and records later changes.
 * Filter writes are chip-wide and must be replayed with the original trace.
 */
import { validateSidEvents } from './analyze-register-events.js';

const BASES = [0, 7, 14];

export function extractSidNoteCandidates(events, { endCycle } = {}) {
  const trace = validateSidEvents(events);
  const lastCycle = trace.at(-1)?.cycle ?? 0;
  const stopCycle = endCycle ?? lastCycle;
  if (!Number.isSafeInteger(stopCycle) || stopCycle < lastCycle) {
    throw new RangeError('endCycle must be an integer at or after the last event');
  }
  const states = new Map();
  const notes = [];
  const filters = new Map();

  function stateFor(chip, voice) {
    const key = `${chip}:${voice}`;
    if (!states.has(key)) states.set(key, {
      chip, voice, registers: new Uint8Array(7), active: null,
    });
    return states.get(key);
  }

  for (const event of trace) {
    const { chip, cycle, register, value } = event;
    if (register >= 21 && register <= 24) {
      if (!filters.has(chip)) filters.set(chip, []);
      filters.get(chip).push(event);
      continue;
    }
    const voiceIndex = BASES.findIndex(base => register >= base && register < base + 7);
    if (voiceIndex < 0) continue;
    const state = stateFor(chip, voiceIndex + 1);
    const offset = register - BASES[voiceIndex];
    const previousControl = state.registers[4];
    state.registers[offset] = value;
    if (state.active) state.active.events.push(event);
    if (offset !== 4) continue;

    const wasGated = (previousControl & 1) !== 0;
    const isGated = (value & 1) !== 0;
    if (wasGated && !isGated && state.active) {
      state.active.gateOffCycle = cycle;
      state.active.endCycle = cycle;
      state.active = null;
    } else if (!wasGated && isGated) {
      const note = {
        chip, voice: voiceIndex + 1, startCycle: cycle,
        gateOffCycle: null, endCycle: null,
        initialRegisters: Array.from(state.registers),
        events: [event],
      };
      notes.push(note);
      state.active = note;
    }
  }

  for (const state of states.values()) {
    if (state.active) {
      state.active.endCycle = stopCycle;
      state.active.incomplete = true;
    }
  }
  return {
    schemaVersion: 1,
    timebase: 'c64-cycles',
    notes,
    chipFilterEvents: [...filters.entries()].map(([chip, events]) => ({ chip, events })),
    limitations: [
      'Gate transitions identify note candidates, not guaranteed distinct instruments.',
      'Retriggers without a gate-off transition may not be detected.',
      'Shared SID filter state and release tails require full-trace rendering.',
    ],
  };
}
