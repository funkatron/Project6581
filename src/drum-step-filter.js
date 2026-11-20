import {filterRoutingMaskForDrumSlot} from './drum-slot-filter.js';

/** Which lane’s filter register snapshot wins when several hit on one step. */
export const DRUM_FILTER_LANE_PRIORITY = Object.freeze(['kick', 'sn', 'ch', 'oh']);

/** Lane id that should own the chip filter for this step, or null when no hits. */
export function chooseDrumFilterLane(resolvedHits) {
  if (!resolvedHits?.length) return null;
  const lanes = new Set(resolvedHits.map((hit) => hit.lane));
  for (const lane of DRUM_FILTER_LANE_PRIORITY) {
    if (lanes.has(lane)) return lane;
  }
  return null;
}

/** Filter register routing: only the priority voice uses the filter; others stay direct. */
export function drumStepFilterRoutingMask(primarySlot) {
  if (!Number.isInteger(primarySlot) || primarySlot < 0 || primarySlot > 2) {
    throw new RangeError('Drum filter slot must be 0–2');
  }
  return filterRoutingMaskForDrumSlot(primarySlot);
}