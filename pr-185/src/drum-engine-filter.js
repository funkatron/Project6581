/** All three SID 4 voices share one analog filter block (authentic 6581 routing). */
export const DRUM_ENGINE_FILTER_ROUTING = 7;

export function drumEngineFilterRegisters(filterRegs) {
  return {
    ...filterRegs,
    routing: DRUM_ENGINE_FILTER_ROUTING,
  };
}