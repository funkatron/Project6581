/** DRUM SEQ tab shell — grid mount point until D3 wires interactions. */
export function mountDrumPanelShell({ $ } = {}) {
  if (!$) throw new TypeError('mountDrumPanelShell requires $');
  const grid = $('drumGrid');
  if (!grid) return;
  grid.replaceChildren();
  const status = $('drumStatus');
  if (status) status.textContent = 'Drum sequencer shell — pattern editor coming in the next slice.';
}