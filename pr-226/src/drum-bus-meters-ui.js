import {meterDisplayWidth} from './sid-meter-display.js?v=0.30.0+20261128T010628315Z';

const METER_LABELS = Object.freeze(['Kick', 'Snare', 'OH/CH']);

function renderBusMeter(busIndex, level) {
  const row = document.createElement('div');
  row.className = 'drum-bus-meter-row';
  row.dataset.drumBusMeter = String(busIndex);

  const label = document.createElement('span');
  label.className = 'drum-bus-meter-label';
  label.textContent = METER_LABELS[busIndex] ?? 'Bus';

  const track = document.createElement('div');
  track.className = 'drum-bus-meter-track';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('div');
  fill.className = 'drum-bus-meter-fill';
  const width = meterDisplayWidth(level);
  fill.style.width = width;
  track.append(fill);

  const wrap = document.createElement('div');
  wrap.className = 'drum-bus-meter';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', (METER_LABELS[busIndex] ?? 'Bus') + ' level ' + width);
  wrap.append(track);

  row.append(label, wrap);
  return {row, fill, wrap};
}

/** Three level meters under the drum pattern (kick / snare / hat buses). */
export function mountDrumBusMeters({$, getLevels} = {}) {
  if (!$) throw new TypeError('mountDrumBusMeters requires $');
  const host = $('drumBusMeters');
  if (!host) return {update: () => {}};

  const meters = [];
  host.replaceChildren();
  for (let bus = 0; bus < 3; bus++) {
    const parts = renderBusMeter(bus, 0);
    meters.push(parts);
    host.append(parts.row);
  }

  function update(levels) {
    const src = levels ?? getLevels?.() ?? [];
    meters.forEach((parts, bus) => {
      const level = Number(src[bus]) || 0;
      const width = meterDisplayWidth(level);
      parts.fill.style.width = width;
      parts.wrap.setAttribute(
        'aria-label',
        (METER_LABELS[bus] ?? 'Bus') + ' level ' + width,
      );
    });
  }

  update();
  return {update};
}