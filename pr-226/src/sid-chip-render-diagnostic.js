/** Chips compiled into residfp.wasm (see native/sid_bridge.cpp kChipCount). */
export const ACTIVE_SID_CHIP_COUNT = 6;

/** Earlier four-chip build, kept so load projections can still scale 4 → 6. */
export const DRUM_EXPANSION_CHIP_TARGET = 6;

export function projectedChipRenderMs({
  renderAvgMs,
  renderMaxMs,
  fromChips = ACTIVE_SID_CHIP_COUNT,
  toChips = DRUM_EXPANSION_CHIP_TARGET,
} = {}) {
  if (!Number.isFinite(renderAvgMs) || !Number.isFinite(renderMaxMs)) return null;
  if (fromChips <= 0 || toChips <= fromChips) return null;
  const scale = toChips / fromChips;
  return {
    fromChips,
    toChips,
    scale,
    projectedAvgMs: renderAvgMs * scale,
    projectedMaxMs: renderMaxMs * scale,
  };
}

export function formatChipRenderDiagnosticLines({renderAvgMs, renderMaxMs, renderBudgetMs} = {}) {
  if (!Number.isFinite(renderAvgMs) || !Number.isFinite(renderMaxMs)) return [];
  const show = (value) => (Number.isFinite(value) ? value.toFixed(1) + ' ms' : 'not reported');
  const lines = [
    'Active reSIDfp chips: ' +
      ACTIVE_SID_CHIP_COUNT +
      ' (SID 1–3 melodic, SID 4 kick, SID 5 snare, SID 6 cymbals).',
  ];
  const projection = projectedChipRenderMs({renderAvgMs, renderMaxMs});
  if (projection) {
    lines.push(
      'Projected render at ' +
        projection.toChips +
        ' chips: ' +
        show(projection.projectedAvgMs) +
        ' avg / ' +
        show(projection.projectedMaxMs) +
        ' max (×' +
        projection.scale.toFixed(2) +
        ').',
    );
  }
  if (Number.isFinite(renderBudgetMs) && renderBudgetMs > 0) {
    const compared = projection ? projection.projectedMaxMs : renderMaxMs;
    const usedPct = (compared / renderBudgetMs) * 100;
    const headroomMs = renderBudgetMs - compared;
    let budgetLine =
      'Render max vs block budget: ' +
      show(compared) +
      ' / ' +
      show(renderBudgetMs) +
      ' (' +
      usedPct.toFixed(0) +
      '% of budget';
    if (headroomMs >= 0) budgetLine += '; ' + show(headroomMs) + ' headroom at max).';
    else budgetLine += '; ' + show(-headroomMs) + ' over budget at max).';
    lines.push(budgetLine);
  }
  return lines;
}