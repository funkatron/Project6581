import {DRUM_STEP_COUNT} from './drum-step-sequencer.js?v=__BUILD_ID__';
import {createGridTimer} from './grid-timer.js?v=__BUILD_ID__';
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

  // Steps follow the grid (see grid-timer.js): a busy page delays a step at most
  // until the page is free; passed steps are skipped instead of dragging the groove.
  const gridTimer = createGridTimer({now, setTimer, clearTimer});
  function onGridStep({n, skipped}) {
    if (skipped > 0) drum.step = (drum.step + skipped) % DRUM_STEP_COUNT;
    drumTick({n, skipped});
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
    gridTimer.stop();
    drum.timer = null;
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
    drum.timer = gridTimer;
    gridTimer.start({ms, onStep: onGridStep, immediate: true});
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
    drum.timer = gridTimer;
    gridTimer.start({ms, onStep: onGridStep, immediate: false});
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