import {mountPitchEnvelopeEditor} from './pitch-envelope-editor.js?v=0.21.9+20261121T185247320Z';
import {setLayoutInert} from './ui-layout.js?v=0.21.9+20261121T185247320Z';
import {drumLaneTimbre} from './drum-lane-trigger.js?v=0.21.9+20261121T185247320Z';
import {applyDrumVoiceColorTokens} from './drum-voice-colors.js?v=0.21.9+20261121T185247320Z';
import {DRUM_PITCH_OFFSET_SEMITONES} from './drum-step-sequencer.js?v=0.21.9+20261121T185247320Z';
import {
  DRUM_BUS_LANES,
  DRUM_VOICE_ADSR_FIELDS,
  DRUM_VOICE_PULSE_FIELDS,
  drumBusShowsPitchEnvelope,
  drumBusShowsPulse,
  drumBusWaveLabel,
  drumFactoryPresetOptions,
} from './drum-voice-ui-policy.js?v=0.21.9+20261121T185247320Z';

const BUS_TAB_BUS = Object.freeze(['kick', 'sn', 'hat']);

function formatPitchOffsetLabel(semitones) {
  if (semitones > 0) return '+' + semitones;
  return String(semitones);
}

const BUS_TAB_LABELS = Object.freeze(['Kick', 'Snare', 'Hat']);

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
  onActiveBusChange,
  bindHelp,
} = {}) {
  if (!$ || !getDrumKit || !factoryPresets?.length) {
    throw new TypeError('mountDrumSlotVoicePanels requires $, getDrumKit, and factoryPresets');
  }

  const drumPresets = drumFactoryPresetOptions(factoryPresets);
  let activeBusIndex = 0;

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
    const {voice, presetId} = effectiveLaneTimbre(factoryPresets, lane);
    const card = document.createElement('article');
    card.className = 'drum-bus-card panel';
    card.dataset.drumBus = String(bus.slot);
    card.dataset.drumWave = voice.wave;
    card.id = 'drumBusPanel' + bus.slot;
    card.setAttribute('role', 'tabpanel');
    card.setAttribute('aria-labelledby', 'drumBusTab' + bus.slot);

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
    presetLabel.textContent = 'Sequence sound ';
    const presetSelect = document.createElement('select');
    presetSelect.setAttribute('aria-label', bus.title + ' sequence sound');
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
      const pitchLabel = document.createElement('label');
    pitchLabel.className = 'drum-bus-preset';
    pitchLabel.textContent = 'Pitch offset ';
    const pitchSelect = document.createElement('select');
    pitchSelect.setAttribute('aria-label', bus.title + ' pitch offset semitones');
    for (const step of DRUM_PITCH_OFFSET_SEMITONES) {
      const option = document.createElement('option');
      option.value = String(step);
      option.textContent = formatPitchOffsetLabel(step);
      pitchSelect.append(option);
    }
    const kitLane = getDrumKit().lanes[bus.laneId];
    pitchSelect.value = String(kitLane.pitchOffsetSemitones ?? 0);
    pitchLabel.append(pitchSelect);

    card.append(title, presetLabel, pitchLabel, meta);

    pitchSelect.addEventListener('change', () => {
      const semitones = Number(pitchSelect.value);
      if (bus.laneId === 'ch') {
        const kitNow = getDrumKit();
        const lanes = {
          ...kitNow.lanes,
          ch: {...kitNow.lanes.ch, pitchOffsetSemitones: semitones},
          oh: {...kitNow.lanes.oh, pitchOffsetSemitones: semitones},
        };
        setDrumKit({...kitNow, lanes});
      } else {
        const laneRow = {...getDrumKit().lanes[bus.laneId], pitchOffsetSemitones: semitones};
        commitLane(bus, laneRow);
      }
      onKitStructureChange?.();
    });

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

    const pitchHost = document.createElement('div');
    pitchHost.className = 'drum-bus-pitch drum-bus-controls-full';
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

  function syncTabSelection(tablist) {
    const tabs = tablist.querySelectorAll('[role="tab"]');
    tabs.forEach((tab, index) => {
      const selected = index === activeBusIndex;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-active', selected);
    });
  }

  function selectBus(index) {
    if (!Number.isInteger(index) || index < 0 || index >= DRUM_BUS_LANES.length) return;
    activeBusIndex = index;
    onActiveBusChange?.(index);
    render();
  }

  function render() {
    const tablist = $('drumBusTablist');
    const host = $('drumSlotVoices');
    if (!host || !tablist) return;

    applyDrumVoiceColorTokens($('drumPanel'));

    tablist.replaceChildren();
    DRUM_BUS_LANES.forEach((bus, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'drum-bus-tab';
      tab.id = 'drumBusTab' + bus.slot;
      tab.dataset.bus = BUS_TAB_BUS[index] ?? 'kick';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'drumBusPanel' + bus.slot);
      tab.textContent = BUS_TAB_LABELS[index] ?? bus.title;
      tab.addEventListener('click', () => selectBus(index));
      tablist.append(tab);
    });
    syncTabSelection(tablist);

    host.replaceChildren();
    const activeBus = DRUM_BUS_LANES[activeBusIndex] ?? DRUM_BUS_LANES[0];
    host.dataset.activeBus = BUS_TAB_BUS[activeBusIndex] ?? 'kick';
    host.append(renderBus(activeBus));
  }

  render();
  return {render, syncFromKit: render, selectBus, getActiveBusIndex: () => activeBusIndex};
}