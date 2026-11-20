import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatChipRenderDiagnosticLines,
  projectedChipRenderMs,
} from '../src/sid-chip-render-diagnostic.js';

test('projectedChipRenderMs scales 4 → 6 chips linearly', () => {
  const projection = projectedChipRenderMs({renderAvgMs: 0.8, renderMaxMs: 1.2});
  assert.ok(projection);
  assert.equal(projection.scale, 1.5);
  assert.ok(Math.abs(projection.projectedAvgMs - 1.2) < 1e-9);
  assert.ok(Math.abs(projection.projectedMaxMs - 1.8) < 1e-9);
});

test('formatChipRenderDiagnosticLines includes budget headroom when render metrics exist', () => {
  const lines = formatChipRenderDiagnosticLines({
    renderAvgMs: 1,
    renderMaxMs: 2,
    renderBudgetMs: 2.67,
  });
  assert.ok(lines.some((line) => line.includes('Projected render at 6 chips')));
  assert.ok(lines.some((line) => line.includes('block budget')));
});

test('formatChipRenderDiagnosticLines is empty without render metrics', () => {
  assert.deepEqual(formatChipRenderDiagnosticLines({}), []);
});