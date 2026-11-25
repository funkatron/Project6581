import {DRUM_STEP_COUNT} from './drum-step-sequencer.js?v=__BUILD_ID__';
import {drumStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {stepMilliseconds} from './arp-composition.js?v=__BUILD_ID__';
import {drumBpm} from './drum-lane-trigger.js?v=__BUILD_ID__';
import {drumSequence} from './transport-state.js?v=__BUILD_ID__';

const RATE_LABEL = {0.25: '1/1', 0.5: '1/2', 1: '1/4', 2: '1/8', 4: '1/16', 8: '1/32', 16: '1/64', 32: '1/128'};

export function drumStepIntervalMs(sequence, masterBpm) {
  const bpm = drumBpm(sequence, masterBpm);
  const rate = Number(sequence.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError('Invalid drum rate');
  return stepMilliseconds(bpm, rate);
}

export function mountDrumPerformance({
  $,
  drum,
  transport,
  triggerDrumStep,
  stopDrumVoices,
  refreshPresetDirty,
  onTransportChange,
  onStep,
  onDrumStart,
  shadow,
  // Injectable for tests. now() is in milliseconds.
  now = () => performance.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = id => clearTimeout(id),
}) {
  if (!$) throw new TypeError('mountDrumPerformance requires $');
  if (!transport) throw new TypeError('mountDrumPerformance requires transport');

  const liveSequence = () => drumSequence(transport.getState());

  function setTransportLabel(running) {
    const run = $('drumSeqRun');
    const stop = $('drumSeqStop');
    if (run) {
      run.textContent = running ? '▶ Previewing' : '▶ Preview';
      run.setAttribute('aria-pressed', String(running));
      run.disabled = false;
    }
    if (stop) stop.disabled = false;
    onTransportChange?.(running);
  }

  function updateStatus(running, stepIndex) {
    const status = $('drumStatus');
    if (!status) return;
    const seq = liveSequence();
    const rateLabel = RATE_LABEL[seq.rate] ?? '1/16';
    const bpm = drumBpm(seq, transport.masterBpm);
    const step = running ? ' step ' + ((stepIndex % DRUM_STEP_COUNT) + 1) : '';
    status.textContent =
      (running ? 'Drum preview · ' + bpm + ' BPM · ' + rateLabel + step : '16 steps · 4 lanes · stopped');
  }

  // The drum timer aims every tick at start + n × step (grid.anchor + grid.n × grid.ms)
  // instead of "one interval after the last tick" (setInterval). A tick that is late
  // by less than a step plays at once and the next aims back at the grid; when the
  // page was busy for a whole step or more, the passed steps are skipped, so the
  // groove stays in time instead of dragging (iPad, 2026-11-25: +2.3 s by the end
  // of a run with setInterval while playing the keyboard with Game Arp on).
  let grid = null;

  function scheduleNext() {
    const due = grid.anchor + grid.n * grid.ms;
    drum.timer = setTimer(onGridTimer, Math.max(0, due - now()));
  }

  function onGridTimer() {
    drum.timer = null;
    if (!drum.running || !grid) return;
    const behind = Math.floor((now() - (grid.anchor + grid.n * grid.ms)) / grid.ms);
    if (behind > 0) {
      drum.step = (drum.step + behind) % DRUM_STEP_COUNT;
      grid.n += behind;
    }
    drumTick({n: grid.n - grid.first, skipped: Math.max(0, behind)});
    grid.n++;
    scheduleNext();
  }

  function drumTick({n, skipped = 0} = {}) {
    const {clock, index, hits} = drumStep({step: drum.step}, {sequence: liveSequence()});
    drum.step = clock.step;
    shadow?.tick({index, hits, n, skipped});
    triggerDrumStep(hits);
    onStep?.(index);
    updateStatus(true, index);
  }

  function drumStop({resetStep = true} = {}) {
    if (drum.timer !== null) {
      clearTimer(drum.timer);
      drum.timer = null;
    }
    grid = null;
    drum.running = false;
    shadow?.stop();
    if (resetStep) drum.step = 0;
    stopDrumVoices();
    onStep?.(-1);
    setTransportLabel(false);
    updateStatus(false, 0);
  }

  function drumStart() {
    drumStop({resetStep: true});
    drum.running = true;
    setTransportLabel(true);
    shadow?.run({step: drum.step, delayMs: 0});
    const ms = drumStepIntervalMs(liveSequence(), transport.masterBpm);
    grid = {anchor: now(), ms, n: 0, first: 0};
    drumTick({n: 0});
    grid.n = 1;
    scheduleNext();
    onDrumStart?.();
    refreshPresetDirty?.();
  }

  function drumRestartIfRunning() {
    if (!drum.running) return;
    drumStop({resetStep: false});
    drum.running = true;
    setTransportLabel(true);
    const ms = drumStepIntervalMs(liveSequence(), transport.masterBpm);
    shadow?.run({step: drum.step, delayMs: ms});
    // Keep the step; the next tick is one new interval from now.
    grid = {anchor: now(), ms, n: 1, first: 1};
    scheduleNext();
    updateStatus(true, drum.step);
  }

  $('drumBpm')?.addEventListener('input', () => {
    const out = $('drumBpmValue');
    if (out) out.textContent = $('drumBpm').value;
  });

  $('drumSeqRun')?.addEventListener('click', () => drumStart());
  $('drumSeqStop')?.addEventListener('click', () => {
    drumStop();
    refreshPresetDirty?.();
  });
  for (const id of ['drumRate', 'drumSync', 'drumBpm', 'masterBpm']) {
    $(id)?.addEventListener('input', () => drumRestartIfRunning());
    $(id)?.addEventListener('change', () => drumRestartIfRunning());
  }

  setTransportLabel(false);
  updateStatus(false, 0);

  return {drumStart, drumStop, drumRestartIfRunning, drumTick};
}