import {LFO_WAVES} from './lfo-modulation.js?v=__BUILD_ID__';

/** SID 4 drum LFO targets (no global detune / PWM rate controls on this tab). */
export const DRUM_LFO_TARGET_ORDER = [
  'cutoff', 'resonance', 'volume', 'pan', 'pulse', 'attack', 'decay', 'sustain', 'release',
];

function appendSliderRow(parent, labelText, input, formatValue) {
  const row = document.createElement('div');
  row.className = 'param-row lfo-slider-row';
  const label = document.createElement('span');
  label.className = 'param-label';
  label.textContent = labelText;
  const track = document.createElement('div');
  track.className = 'param-track';
  const values = document.createElement('div');
  values.className = 'param-values';
  const output = document.createElement('output');
  output.className = 'param-value base-value';
  output.textContent = formatValue(input);
  track.append(input);
  values.append(output);
  row.append(label, track, values);
  parent.append(row);
  return {row, output};
}

export function mountDrumLfoPanel({$, drumLfoState, lfoTargetNames, syncedRates, getLfoTargets, onChange, bindHelp} = {}) {
  if (!$ || !drumLfoState) throw new TypeError('mountDrumLfoPanel requires $ and drumLfoState');

  function renderDrumLfo() {
    const root = $('drumLfoControls');
    if (!root) return;
    root.replaceChildren();
    const group = document.createElement('fieldset');
    group.className = 'lfo-controls drum-lfo-block';
    const legend = document.createElement('legend');
    legend.textContent = 'Drum LFO · SID 4';
    group.append(legend);
    const sliderGrid = document.createElement('div');
    sliderGrid.className = 'lfo-slider-grid';
    const lfo = drumLfoState;
    const fields = [
      ['enabled', 'On'],
      ['sync', 'Sync'],
      ['wave', 'Wave'],
      ['target', 'Target'],
      ['rate', 'Rate'],
      ['depth', 'Depth'],
    ];
    for (const [prop, label] of fields) {
      const row = document.createElement('label');
      row.textContent = label + ' ';
      const isSwitch = prop === 'enabled' || prop === 'sync';
      const isSelect = prop === 'wave' || prop === 'target' || (prop === 'rate' && lfo.sync);
      const input = document.createElement(isSelect ? 'select' : 'input');
      if (isSwitch) {
        input.type = 'checkbox';
        input.checked = Boolean(lfo[prop]);
      } else if (isSelect) {
        const lfoTargets=getLfoTargets?.()??DRUM_LFO_TARGET_ORDER;
        const choices =
          prop === 'wave' ? LFO_WAVES :
          prop === 'target' ? lfoTargets :
          syncedRates;
        choices.forEach(value => {
          const option = document.createElement('option');
          option.value = String(prop === 'rate' ? value.value : value);
          option.textContent =
            prop === 'rate' ? value.label :
            prop === 'target' ? (lfoTargetNames[value] || value) :
            value;
          input.append(option);
        });
        if(prop==='target'&&!lfoTargets.includes(lfo.target))lfo.target=lfoTargets[0];
        input.value = String(prop === 'rate' ? lfo.syncDivision : lfo[prop]);
      } else {
        input.type = 'range';
        input.min = prop === 'rate' ? '0.05' : '0';
        input.max = prop === 'rate' ? '20' : '100';
        input.step = prop === 'rate' ? '0.05' : '1';
        input.value = prop === 'rate' ? lfo.rate : lfo.depth * 100;
      }
      input.setAttribute(
        'aria-label',
        'Drum LFO ' + label + (prop === 'rate' ? (lfo.sync ? ' division' : ' Hz') : ''),
      );
      if (isSwitch || isSelect) {
        input.addEventListener('change', () => {
          if (isSwitch) lfo[prop] = input.checked;
          else if (prop === 'rate' && lfo.sync) lfo.syncDivision = Number(input.value);
          else lfo[prop] = isSelect ? input.value : Number(input.value);
          if (prop === 'sync') renderDrumLfo();
          onChange?.();
        });
        row.append(input);
        group.append(row);
        continue;
      }
      const {output} = appendSliderRow(
        sliderGrid,
        label,
        input,
        inp => (prop === 'rate' ? Number(inp.value).toFixed(2) + ' Hz' : inp.value + '%'),
      );
      input.addEventListener('input', () => {
        if (prop === 'depth') lfo.depth = Number(input.value) / 100;
        else lfo[prop] = Number(input.value);
        output.textContent = prop === 'rate' ? Number(input.value).toFixed(2) + ' Hz' : input.value + '%';
        onChange?.();
      });
    }
    if (sliderGrid.childElementCount) group.append(sliderGrid);
    root.append(group);
    bindHelp?.(root);
  }

  renderDrumLfo();
  return {renderDrumLfo};
}