/** Chips compiled into residfp.wasm today (see native/sid_bridge.cpp kChipCount). */
export const ACTIVE_SID_CHIP_COUNT = 4;

/** Hypothetical drum expansion (+2 dedicated SID instances) for load planning. */
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
  const projection = projectedChipRenderMs({renderAvgMs, renderMaxMs});
  if (!projection) return [];
  const show = (value) => (Number.isFinite(value) ? value.toFixed(1) + ' ms' : 'not reported');
  const lines = [
    'Active reSIDfp chips: ' + projection.fromChips + ' (WASM render scales ~linearly with chip count).',
    'Projected render at ' +
      projection.toChips +
      ' chips (+2 drum SIDs): ' +
      show(projection.projectedAvgMs) +
      ' avg / ' +
      show(projection.projectedMaxMs) +
      ' max (×' +
      projection.scale.toFixed(2) +
      ').',
  ];
  if (Number.isFinite(renderBudgetMs) && renderBudgetMs > 0) {
    const usedPct = (projection.projectedMaxMs / renderBudgetMs) * 100;
    const headroomMs = renderBudgetMs - projection.projectedMaxMs;
    let budgetLine =
      'Projected max vs block budget: ' +
      show(projection.projectedMaxMs) +
      ' / ' +
      show(renderBudgetMs) +
      ' (' +
      usedPct.toFixed(0) +
      '% of budget';
    if (headroomMs >= 0) budgetLine += '; ' + show(headroomMs) + ' headroom at max).';
    else budgetLine += '; ' + show(-headroomMs) + ' over budget at max).';
    lines.push(budgetLine);
  }
  lines.push('Projection is linear scaling only—not measured on device. Use live avg/max above for today’s load.');
  return lines;
}