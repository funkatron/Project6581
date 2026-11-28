/** Map UI filter fields (Hz, 0–100) to SidRegisters.setFilter units. */
export function filterRegistersFromUi(filter) {
  const hz = Number(filter.cutoff);
  const cutoff = Math.round(Math.max(0, Math.min(1, (hz - 50) / 9950)) * 2047);
  const resonancePct = Number(filter.resonance);
  const volumePct = Number(filter.volume);
  const mode = filter.mode ?? 'lowpass';
  return {
    cutoff,
    resonance: Math.round((resonancePct * 15) / 100),
    mode,
    volume: Math.round((volumePct * 15) / 100),
  };
}