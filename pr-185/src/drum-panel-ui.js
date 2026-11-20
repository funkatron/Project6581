import {bindHelpGesture} from './ui-help-gesture.js?v=0.20.1+20261120T195340473Z';
import {
  DRUM_LANE_COUNT,
  DRUM_LANE_IDS,
  DRUM_STEP_COUNT,
  defaultDrumSequence,
  validateDrumSequence,
} from './drum-step-sequencer.js';

const LANE_LABEL = {
  kick: 'Kick',
  sn: 'Sn',
  ch: 'CH',
  oh: 'OH',
};

const LANE_HELP = {
  kick: 'drum-lane-kick',
  sn: 'drum-lane-sn',
  ch: 'drum-lane-ch',
  oh: 'drum-lane-oh',
};

/** SID 4 voice slot colors (mixer strip / rail). */
const LANE_VOICE_RAIL = {
  kick: ['drum-lane-rail--v1'],
  sn: ['drum-lane-rail--v2'],
  ch: ['drum-lane-rail--hat', 'drum-lane-rail--hat-first'],
  oh: ['drum-lane-rail--hat', 'drum-lane-rail--hat-last'],
};

function syncLaneLevelReadout(head, levelInput, readout) {
  const level = Number(levelInput.value);
  if (readout) readout.textContent = String(level);
  head.classList.toggle('is-muted', level <= 0);
  levelInput.setAttribute('aria-valuenow', String(level));
}

/**
 * 16×4 drum grid, lane level sliders, playhead column highlight.
 */
export function mountDrumPanel({
  $,
  getDrumSequence,
  setDrumSequence,
  getDrumKit,
  setDrumKit,
  triggerDrumLane,
  onPatternChange,
  help$ = id => document.getElementById(id),
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

  function sequenceNeedsHeal(raw) {
    if (!raw?.grid || !Array.isArray(raw.grid)) return true;
    if (raw.grid.length !== DRUM_LANE_COUNT) return true;
    return raw.grid.some(
      (row) => !Array.isArray(row) || row.length !== DRUM_STEP_COUNT,
    );
  }

  function sequenceForRender() {
    const raw = getDrumSequence();
    try {
      const seq = validateDrumSequence(raw);
      if (sequenceNeedsHeal(raw)) setDrumSequence(seq);
      return seq;
    } catch {
      const seq = validateDrumSequence(defaultDrumSequence());
      setDrumSequence(seq);
      return seq;
    }
  }

  function render() {
    const seq = sequenceForRender();
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
      if (laneId === 'ch') head.classList.add('drum-lane-head--hat-first');
      if (laneId === 'oh') head.classList.add('drum-lane-head--hat-last');
      head.setAttribute('role', 'rowheader');

      const rail = document.createElement('span');
      rail.className = ['drum-lane-rail', ...(LANE_VOICE_RAIL[laneId] ?? [])].join(' ');
      rail.setAttribute('aria-hidden', 'true');
      let railTitle = 'SID voice 1';
      if (laneId === 'sn') railTitle = 'SID voice 2';
      if (laneId === 'ch' || laneId === 'oh') railTitle = 'SID voice 3 (hat)';
      rail.title = railTitle;

      const title = document.createElement('span');
      title.className = 'drum-lane-label';
      title.textContent = LANE_LABEL[laneId] ?? laneId;
      title.tabIndex = 0;
      title.setAttribute('role', 'button');
      title.setAttribute(
        'aria-label',
        (LANE_LABEL[laneId] ?? laneId) + ' lane — long-press for voice help',
      );
      bindHelpGesture(title, {helpId: LANE_HELP[laneId] ?? 'drum-voice-allocation', $: help$});

      const mixer = document.createElement('div');
      mixer.className = 'drum-lane-mixer';

      const levelStack = document.createElement('span');
      levelStack.className = 'slider-stack drum-lane-level-stack';

      const level = document.createElement('input');
      level.type = 'range';
      level.className = 'drum-lane-level';
      level.min = '0';
      level.max = '100';
      level.step = '1';
      level.value = String(kit.lanes[laneId]?.level ?? 80);
      level.setAttribute('aria-label', (LANE_LABEL[laneId] ?? laneId) + ' level');

      const readout = document.createElement('output');
      readout.className = 'drum-lane-level-readout';
      readout.setAttribute('for', level.id || '');
      readout.setAttribute('aria-hidden', 'true');

      level.addEventListener('input', () => {
        const kitNow = getDrumKit();
        const nextLevel = Number(level.value);
        const next = {
          ...kitNow,
          lanes: {...kitNow.lanes, [laneId]: {...kitNow.lanes[laneId], level: nextLevel}},
        };
        setDrumKit(next);
        syncLaneLevelReadout(head, level, readout);
        onPatternChange?.();
      });
      bindHelpGesture(level, {helpId: 'drum-lane-level', $: help$});

      levelStack.append(level);
      mixer.append(levelStack, readout);
      head.append(rail, title, mixer);
      syncLaneLevelReadout(head, level, readout);
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
        bindHelpGesture(cell, {
          helpId: 'drum-cell',
          $: help$,
          onTap: () => {
            const current = getDrumSequence();
            const wasOn = Boolean(current.grid[rowIndex][step]);
            const nowOn = !wasOn;
            const nextGrid = current.grid.map((r, ri) =>
              ri === rowIndex ? r.map((c, ci) => (ci === step ? nowOn : c)) : [...r],
            );
            setDrumSequence({...current, grid: nextGrid});
            syncCell(cell, nowOn);
            cell.setAttribute(
              'aria-label',
              (LANE_LABEL[laneId] ?? laneId) + ' step ' + (step + 1) + (nowOn ? ', hit' : ', rest'),
            );
            if (nowOn) triggerDrumLane?.(laneId);
            onPatternChange?.();
          },
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