/** Shared drum bus colors (grid rails + bus tabs). */
export const DRUM_VOICE_BUS_HEX = Object.freeze({
  kick: '#3d6f5f',
  sn: '#8b5e48',
  hat: '#6a5d82',
});

function parseHex(hex) {
  const raw = String(hex).replace('#', '');
  if (raw.length !== 6) throw new RangeError('Expected #RRGGBB');
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

function channelLinear(channel) {
  const c = channel / 255;
  if (c <= 0.03928) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex);
  const rs = channelLinear(r);
  const gs = channelLinear(g);
  const bs = channelLinear(b);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Body text on a solid bus tab / rail companion color. */
export function contrastInkOnBackground(hex) {
  const bg = relativeLuminance(hex);
  const white = (1.0 + 0.05) / (bg + 0.05);
  const black = (bg + 0.05) / 0.05;
  if (white >= black) return '#f8f4ef';
  return '#252925';
}

export function applyDrumVoiceColorTokens(panelEl) {
  if (!panelEl) return;
  for (const bus of Object.keys(DRUM_VOICE_BUS_HEX)) {
    const hex = DRUM_VOICE_BUS_HEX[bus];
    panelEl.style.setProperty('--drum-voice-' + bus, hex);
    panelEl.style.setProperty('--drum-voice-' + bus + '-ink', contrastInkOnBackground(hex));
  }
}