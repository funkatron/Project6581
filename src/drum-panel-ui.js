import {
  DRUM_LANE_COUNT,
  DRUM_LANE_IDS,
  DRUM_STEP_COUNT,
} from './drum-step-sequencer.js';

const LANE_LABEL = {
  kick: 'Kick',
  sn: 'Sn',
  ch: 'CH',
  oh: 'OH',
  clap: 'Clap',
  tom: 'Tom',
};

/**
 * 16×6 drum grid, lane level sliders, playhead column highlight.
 */
export function mountDrumPanel({
  $,
  getDrumSequence,
  setDrumSequence,
  getDrumKit,
  setDrumKit,
  triggerDrumLane,
  onPatternChange,
} = {}) {
  if (!$) throw new TypeError('mountDrumPanel requires $');
  const scroller = $('drumGridScroller');
  const host = $('drumGrid');
  if (!host) return {setActiveStep: () => {}, render: () => {}};

  let activeStep = -1;
  const cellByStep = Array.from({length: DRUM_STEP_COUNT}, () => []);
  const stepHeaders = [];

  function setActiveStep(stepIndex) {
    if (activeStep === stepIndex) return;
    for (const cell of cellByStep[activeStep] ?? []) {
      cell.classList.remove('is-playing');
      cell.removeAttribute('aria-current');
    }
    for (const num of stepHeaders) num.classList.remove('is-playing');
    activeStep = stepIndex;
    if (activeStep < 0) return;
    stepHeaders[activeStep]?.classList.add('is-playing');
    for (const cell of cellByStep[activeStep] ?? []) {
      cell.classList.add('is-playing');
      cell.setAttribute('aria-current', 'step');
    }
  }

  function syncCell(cell, on) {
    cell.dataset.on = on ? '1' : '0';
    cell.classList.toggle('is-on', on);
    cell.setAttribute('aria-pressed', String(on));
  }

  function render() {
    const seq = getDrumSequence();
    const kit = getDrumKit();
    host.replaceChildren();
    cellByStep.forEach((_, i) => {
      cellByStep[i] = [];
    });
    stepHeaders.length = 0;
    activeStep = -1;

    const table = document.createElement('div');
    table.className = 'drum-grid-table';
    table.setAttribute('role', 'grid');
    table.setAttribute(
      'aria-label',
      'Drum pattern, ' + DRUM_LANE_COUNT + ' lanes by ' + DRUM_STEP_COUNT + ' steps',
    );

    const header = document.createElement('div');
    header.className = 'drum-grid-row drum-grid-header';
    header.setAttribute('role', 'row');
    const corner = document.createElement('div');
    corner.className = 'drum-grid-corner';
    corner.setAttribute('role', 'columnheader');
    corner.setAttribute('aria-hidden', 'true');
    header.append(corner);
    for (let step = 0; step < DRUM_STEP_COUNT; step++) {
      const num = document.createElement('div');
      num.className = 'drum-step-num';
      num.setAttribute('role', 'columnheader');
      num.textContent = String(step + 1);
      stepHeaders.push(num);
      header.append(num);
    }
    table.append(header);

    DRUM_LANE_IDS.forEach((laneId, rowIndex) => {
      const row = document.createElement('div');
      row.className = 'drum-grid-row';
      row.setAttribute('role', 'row');

      const head = document.createElement('div');
      head.className = 'drum-lane-head';
      head.setAttribute('role', 'rowheader');
      const title = document.createElement('span');
      title.className = 'drum-lane-label';
      title.textContent = LANE_LABEL[laneId] ?? laneId;
      const level = document.createElement('input');
      level.type = 'range';
      level.className = 'drum-lane-level';
      level.min = '0';
      level.max = '100';
      level.step = '1';
      level.value = String(kit.lanes[laneId]?.level ?? 80);
      level.setAttribute('aria-label', (LANE_LABEL[laneId] ?? laneId) + ' level');
      level.addEventListener('input', () => {
        const next = {...kit, lanes: {...kit.lanes, [laneId]: {...kit.lanes[laneId], level: Number(level.value)}}};
        setDrumKit(next);
        onPatternChange?.();
      });
      head.append(title, level);
      row.append(head);

      for (let step = 0; step < DRUM_STEP_COUNT; step++) {
        const on = Boolean(seq.grid[rowIndex][step]);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'drum-cell';
        cell.dataset.lane = laneId;
        cell.dataset.step = String(step);
        syncCell(cell, on);
        cell.setAttribute(
          'aria-label',
          (LANE_LABEL[laneId] ?? laneId) + ' step ' + (step + 1) + (on ? ', hit' : ', rest'),
        );
        cell.addEventListener('click', () => {
          const nextGrid = seq.grid.map((r, ri) =>
            ri === rowIndex ? r.map((c, ci) => (ci === step ? !c : c)) : [...r],
          );
          const next = {...seq, grid: nextGrid};
          setDrumSequence(next);
          const nowOn = !on;
          syncCell(cell, nowOn);
          cell.setAttribute(
            'aria-label',
            (LANE_LABEL[laneId] ?? laneId) + ' step ' + (step + 1) + (nowOn ? ', hit' : ', rest'),
          );
          if (nowOn) triggerDrumLane?.(laneId);
          onPatternChange?.();
        });
        cellByStep[step].push(cell);
        row.append(cell);
      }
      table.append(row);
    });

    host.append(table);
    if (scroller && !scroller.contains(host)) scroller.append(host);
  }

  render();
  return {render, setActiveStep};
}