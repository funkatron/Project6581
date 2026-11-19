import {DRUM_STEP_COUNT, hitsOnStep} from './drum-step-sequencer.js';
import {resolveDrumHitsOnStep} from './drum-voice-policy.js';
import {stepMilliseconds} from './arp-composition.js';
import {drumBpm} from './drum-lane-trigger.js';

const RATE_LABEL = {0.25: '1/1', 0.5: '1/2', 1: '1/4', 2: '1/8', 4: '1/16', 8: '1/32', 16: '1/64', 32: '1/128'};

export function readDrumSequenceFromDom($, sequence) {
  const rate = Number($('drumRate')?.value);
  const sync = $('drumSync')?.checked !== false;
  const localBpm = Math.round(Number($('drumBpm')?.value) || sequence.localBpm || 120);
  return {...sequence, rate: Number.isFinite(rate) ? rate : sequence.rate, sync, localBpm};
}

export function drumStepIntervalMs(sequence, masterBpm) {
  const bpm = drumBpm(sequence, masterBpm);
  const rate = Number(sequence.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError('Invalid drum rate');
  return stepMilliseconds(bpm, rate);
}

export function mountDrumPerformance({
  $,
  drum,
  getDrumSequence,
  getMasterBpm,
  triggerDrumLane,
  stopDrumVoices,
  refreshPresetDirty,
  onTransportChange,
  onStep,
  onDrumStart,
}) {
  if (!$) throw new TypeError('mountDrumPerformance requires $');

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
    const seq = getDrumSequence();
    const rate = Number($('drumRate')?.value ?? seq.rate);
    const rateLabel = RATE_LABEL[rate] ?? '1/16';
    const bpm = drumBpm(readDrumSequenceFromDom($, seq), getMasterBpm());
    const step = running ? ' step ' + ((stepIndex % DRUM_STEP_COUNT) + 1) : '';
    status.textContent =
      (running ? 'Drum preview · ' + bpm + ' BPM · ' + rateLabel + step : '16 steps · 6 lanes · stopped');
  }

  function drumTick() {
    const seq = readDrumSequenceFromDom($, getDrumSequence());
    const index = drum.step % DRUM_STEP_COUNT;
    const hits = hitsOnStep(seq, index);
    drum.step = (index + 1) % DRUM_STEP_COUNT;
    for (const hit of resolveDrumHitsOnStep(hits)) triggerDrumLane(hit.lane, {drumSlot: hit.slot});
    onStep?.(index);
    updateStatus(true, index);
  }

  function drumStop({resetStep = true} = {}) {
    if (drum.timer !== null) {
      clearInterval(drum.timer);
      drum.timer = null;
    }
    drum.running = false;
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
    const seq = readDrumSequenceFromDom($, getDrumSequence());
    drumTick();
    const ms = drumStepIntervalMs(seq, getMasterBpm());
    drum.timer = setInterval(drumTick, ms);
    onDrumStart?.();
    refreshPresetDirty?.();
  }

  function drumRestartIfRunning() {
    if (!drum.running) return;
    drumStop({resetStep: false});
    drum.running = true;
    setTransportLabel(true);
    const seq = readDrumSequenceFromDom($, getDrumSequence());
    const ms = drumStepIntervalMs(seq, getMasterBpm());
    drum.timer = setInterval(drumTick, ms);
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