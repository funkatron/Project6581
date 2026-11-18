/** DRUM SEQ tab shell — grid mount point until D3 wires interactions. */
export function mountDrumPanelShell({ $ } = {}) {
  if (!$) throw new TypeError('mountDrumPanelShell requires $');
  const grid = $('drumGrid');
  if (!grid) return;
  grid.replaceChildren();
  const status = $('drumStatus');
  if (status) status.textContent = '16 steps · 6 lanes · stopped';
}