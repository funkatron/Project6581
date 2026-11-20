import {mountPitchEnvelopeEditor} from './pitch-envelope-editor.js?v=__BUILD_ID__';
import {formatHzBrief, formatPercent} from './control-format.js?v=__BUILD_ID__';
import {setLayoutInert} from './ui-layout.js?v=__BUILD_ID__';
import {drumLaneTimbre} from './drum-lane-trigger.js?v=__BUILD_ID__';
import {
  DRUM_BUS_LANES,
  DRUM_VOICE_ADSR_FIELDS,
  DRUM_VOICE_PULSE_FIELDS,
  drumBusShowsPitchEnvelope,
  drumBusShowsPulse,
  drumBusWaveLabel,
  drumFactoryPresetOptions,
} from './drum-voice-ui-policy.js?v=__BUILD_ID__';

const FILTER_MODES = ['lowpass', 'bandpass', 'highpass'];

function factoryPresetForLane(presets, lane) {
  return presets.find(preset => preset.id === lane.presetId) ?? null;
}

export function effectiveLaneTimbre(presets, lane) {
  const factory = factoryPresetForLane(presets, lane);
  if (!factory) throw new Error('Missing factory preset for lane');
  const {voice, filter} = drumLaneTimbre(factory.settings, lane);
  return {voice, filter, presetName: factory.name, presetId: factory.id};
}

export function mountDrumSlotVoicePanels({
  $,
  getDrumKit,
  setDrumKit,
  factoryPresets,
  formatControlValue,
  onKitStructureChange,
  bindHelp,
} = {}) {
  if (!$ || !getDrumKit || !factoryPresets?.length) {
    throw new TypeError('mountDrumSlotVoicePanels requires $, getDrumKit, and factoryPresets');
  }

  const drumPresets = drumFactoryPresetOptions(factoryPresets);

  function appendSlider(parent, labelText, value, min, max, step, formatFn) {
    const row = document.createElement('div');
    row.className = 'param-row';
    const label = document.createElement('span');
    label.className = 'param-label';
    label.textContent = labelText;
    const track = document.createElement('div');
    track.className = 'param-track';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const values = document.createElement('div');
    values.className = 'param-values';
    const output = document.createElement('output');
    output.className = 'param-value base-value';
    output.textContent = formatFn(value);
    track.append(input);
    values.append(output);
    row.append(label, track, values);
    parent.append(row);
    return {row, input, output};
  }

  function commitLane(bus, laneRow) {
    const nextKit = getDrumKit();
    const lanes = {...nextKit.lanes, [bus.laneId]: laneRow};
    setDrumKit({...nextKit, lanes});
  }

  function renderBus(bus) {
    const kit = getDrumKit();
    const lane = kit.lanes[bus.laneId];
    const {voice, filter, presetId} = effectiveLaneTimbre(factoryPresets, lane);
    const card = document.createElement('article');
    card.className = 'drum-bus-card panel';
    card.dataset.drumBus = String(bus.slot);
    card.dataset.drumWave = voice.wave;
    const title = document.createElement('h4');
    title.className = 'drum-bus-title';
    title.textContent = bus.title;
    if (bus.helpId) {
      const helpBtn = document.createElement('button');
      helpBtn.type = 'button';
      helpBtn.className = 'help-trigger';
      helpBtn.dataset.help = bus.helpId;
      helpBtn.setAttribute('aria-label', 'Help: ' + bus.title);
      helpBtn.textContent = '?';
      title.append(' ', helpBtn);
    }

    const presetLabel = document.createElement('label');
    presetLabel.className = 'drum-bus-preset';
    presetLabel.textContent = 'Factory timbre ';
    const presetSelect = document.createElement('select');
    presetSelect.setAttribute('aria-label', bus.title + ' factory timbre');
    for (const preset of drumPresets) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.append(option);
    }
    presetSelect.value = presetId;
    presetLabel.append(presetSelect);

    const meta = document.createElement('p');
    meta.className = 'drum-bus-meta';
    meta.textContent = 'Synthesis · ' + drumBusWaveLabel(voice.wave);
    if (bus.laneId === 'ch') {
      const note = document.createElement('p');
      note.className = 'drum-bus-note';
      note.textContent = 'Open hat, clap, and tom keep their lane preset when they use this bus.';
      card.append(title, presetLabel, meta, note);
    } else {
      card.append(title, presetLabel, meta);
    }

    presetSelect.addEventListener('change', () => {
      const laneRow = {...getDrumKit().lanes[bus.laneId], presetId: presetSelect.value};
      delete laneRow.voice;
      delete laneRow.filter;
      commitLane(bus, laneRow);
      onKitStructureChange?.();
    });

    const grid = document.createElement('div');
    grid.className = 'drum-bus-controls';

    const commitVoice = (key, raw) => {
      const laneRow = {...getDrumKit().lanes[bus.laneId]};
      laneRow.voice = {...(laneRow.voice ?? {}), [key]: raw};
      commitLane(bus, laneRow);
    };

    const commitFilter = (key, raw) => {
      const laneRow = {...getDrumKit().lanes[bus.laneId]};
      laneRow.filter = {...(laneRow.filter ?? {}), [key]: raw};
      commitLane(bus, laneRow);
    };

    for (const [prop, label, min, max, step] of DRUM_VOICE_ADSR_FIELDS) {
      const slider = appendSlider(
        grid,
        label,
        voice[prop],
        min,
        max,
        step,
        value => formatControlValue(prop, value),
      );
      slider.input.addEventListener('input', () => {
        const value = Number(slider.input.value);
        slider.output.textContent = formatControlValue(prop, value);
        commitVoice(prop, value);
      });
    }

    if (drumBusShowsPulse(voice.wave)) {
      for (const [prop, label, min, max, step] of DRUM_VOICE_PULSE_FIELDS) {
        const slider = appendSlider(
          grid,
          label,
          voice[prop],
          min,
          max,
          step,
          value => formatControlValue(prop, value),
        );
        slider.input.addEventListener('input', () => {
          const value = Number(slider.input.value);
          slider.output.textContent = formatControlValue(prop, value);
          commitVoice(prop, value);
        });
      }
    }

    const filterHeading = document.createElement('h5');
    filterHeading.className = 'drum-bus-filter-heading';
    filterHeading.textContent = 'Filter';
    grid.append(filterHeading);

    const cutoff = appendSlider(grid, 'Cutoff', filter.cutoff, 50, 10000, 1, formatHzBrief);
    cutoff.input.addEventListener('input', () => {
      const value = Number(cutoff.input.value);
      cutoff.output.textContent = formatHzBrief(value);
      commitFilter('cutoff', value);
    });

    const resonance = appendSlider(grid, 'Resonance', filter.resonance, 0, 100, 1, formatPercent);
    resonance.input.addEventListener('input', () => {
      const value = Number(resonance.input.value);
      resonance.output.textContent = formatPercent(value);
      commitFilter('resonance', value);
    });

    const modeLabel = document.createElement('label');
    modeLabel.className = 'drum-bus-filter-mode';
    modeLabel.textContent = 'Mode ';
    const mode = document.createElement('select');
    for (const value of FILTER_MODES) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent =
        value === 'lowpass' ? 'Low-pass' : value === 'bandpass' ? 'Band-pass' : 'High-pass';
      mode.append(option);
    }
    mode.value = filter.mode ?? 'lowpass';
    mode.addEventListener('change', () => commitFilter('mode', mode.value));
    modeLabel.append(mode);
    grid.append(modeLabel);

    const pitchHost = document.createElement('div');
    pitchHost.className = 'drum-bus-pitch';
    const showPitch = drumBusShowsPitchEnvelope(voice);
    setLayoutInert(pitchHost, !showPitch);
    if (showPitch) {
      const pitchHeading = document.createElement('h5');
      pitchHeading.textContent = 'Pitch envelope';
      pitchHost.append(pitchHeading);
      const priorEnabled = Boolean(voice.pitchEnvelope?.enabled);
      mountPitchEnvelopeEditor(pitchHost, {
        getEnvelope: () => effectiveLaneTimbre(factoryPresets, getDrumKit().lanes[bus.laneId]).voice.pitchEnvelope,
        applyEnvelope: envelope => {
          const laneRow = {...getDrumKit().lanes[bus.laneId]};
          laneRow.voice = {...(laneRow.voice ?? {}), pitchEnvelope: envelope};
          commitLane(bus, laneRow);
          if (Boolean(envelope?.enabled) !== priorEnabled) onKitStructureChange?.();
        },
      });
    }

    card.append(grid, pitchHost);
    bindHelp?.(card);
    return card;
  }

  function render() {
    const host = $('drumSlotVoices');
    if (!host) return;
    host.replaceChildren();
    for (const bus of DRUM_BUS_LANES) {
      host.append(renderBus(bus));
    }
  }

  render();
  return {render, syncFromKit: render};
}