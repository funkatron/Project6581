import {DRUM_STEP_COUNT} from './drum-step-sequencer.js?v=__BUILD_ID__';
import {createGridTimer} from './grid-timer.js?v=__BUILD_ID__';
import {drumStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {stepMilliseconds} from './arp-composition.js?v=__BUILD_ID__';
import {drumBpm} from './drum-lane-trigger.js?v=__BUILD_ID__';
import {drumSequence} from './transport-state.js?v=__BUILD_ID__';

/**
 * "Worklet drum timing": the page asks the worklet to play steps from this far
 * ahead, because its start message can arrive late (iPad −5 to −11 ms, CI WebKit
 * down to −64 ms). The page's own step clock starts with the same delay so the
 * grid highlight and the shadow comparison stay on the same steps.
 */
export const WORKLET_DRUM_LEAD_MS = 50;

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
  // True when the worklet should play the drums (Prefs → Worklet drum timing,
  // and the worklet modules loaded). Read at each start/restart.
  workletDrums = () => false,
  leadMs = WORKLET_DRUM_LEAD_MS,
  // The running arp grid timer when the drums should share its phase (arps running, both on
  // the master BPM), else null. Drum starts/restarts then wait for the next arp step.
  arpGrid = () => null,
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
  function onGridStep({n, skipped, nextAt}) {
    if (skipped > 0) drum.step = (drum.step + skipped) % DRUM_STEP_COUNT;
    drumTick({n, skipped});
    // Keep the worklet's drum grid on the page clock (it can lose time when audio stalls).
    if (drum.worklet && drum.running && Number.isFinite(nextAt)) shadow?.sync?.({n: n + 1, delayMs: nextAt - now()});
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
    drum.worklet = false;
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
    drum.worklet = Boolean(shadow) && workletDrums() === true;
    setTransportLabel(true);
    const ms = drumStepIntervalMs(liveSequence(), transport.masterBpm);
    drum.timer = gridTimer;
    if (drum.worklet) {
      const delayMs = arpGrid()?.delayToGrid(leadMs) ?? leadMs;
      shadow.run({step: drum.step, delayMs, play: true});
      gridTimer.start({ms, onStep: onGridStep, delayMs});
    } else {
      // Phase lock: first step on the next arp step (now, if one is due now).
      const lockMs = arpGrid()?.delayToGrid(0) ?? null;
      if (lockMs !== null && lockMs >= 0.5) {
        shadow?.run({step: drum.step, delayMs: lockMs});
        gridTimer.start({ms, onStep: onGridStep, delayMs: lockMs});
      } else {
        shadow?.run({step: drum.step, delayMs: 0});
        gridTimer.start({ms, onStep: onGridStep, immediate: true});
      }
    }
    onDrumStart?.();
    refreshPresetDirty?.();
  }

  function drumRestartIfRunning() {
    if (!drum.running) return;
    drumStop({resetStep: false});
    drum.running = true;
    drum.worklet = Boolean(shadow) && workletDrums() === true;
    setTransportLabel(true);
    const ms = drumStepIntervalMs(liveSequence(), transport.masterBpm);
    // Keep the step; the next tick is one new interval from now (worklet: at least the lead).
    const unlocked = drum.worklet ? Math.max(ms, leadMs) : ms;
    // Phase lock: the next arp step at least the worklet lead away instead.
    const delayMs = arpGrid()?.delayToGrid(drum.worklet ? leadMs : 0) ?? unlocked;
    shadow?.run({step: drum.step, delayMs, play: drum.worklet});
    drum.timer = gridTimer;
    gridTimer.start({ms, onStep: onGridStep, delayMs});
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

  /** The running drum grid timer (for the arps' phase lock), else null. */
  const drumGrid = () => (drum.running && gridTimer.running ? gridTimer : null);

  return {drumStart, drumStop, drumRestartIfRunning, drumTick, drumGrid};
}