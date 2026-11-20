/** SID filter routing bits: voice 1 = 1, voice 2 = 2, voice 3 = 4. */
export const DRUM_SLOT_FILTER_ROUTING = Object.freeze([1, 2, 4]);

export function filterRoutingMaskForDrumSlot(slotIndex) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) {
    throw new RangeError('Drum slot must be 0–2');
  }
  return DRUM_SLOT_FILTER_ROUTING[slotIndex];
}

/**
 * Scope a lane's filter to one physical voice so hits do not stomp the whole chip.
 * Other voices may stay direct (no routing bit) while this voice uses the filter path.
 */
export function drumSlotFilterRegisters(filterRegs, slotIndex) {
  return {
    ...filterRegs,
    routing: filterRoutingMaskForDrumSlot(slotIndex),
  };
}