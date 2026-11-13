import { escapeHTML, icon } from '../lib/ui.js';

function radiationGraph(history = [], dangerLimit = 0.5) {
  const values = Array.isArray(history) && history.length ? history.slice(-18) : [0.12, 0.16, 0.14, 0.18, 0.15, 0.19];
  const width = 880, height = 210, left = 14, right = 18, top = 15, bottom = 20;
  const max = Math.max(dangerLimit * 1.25, ...values, 0.2);
  const min = 0;
  const y = value => top + ((max - value) / (max - min)) * (height - top - bottom);
  const points = values.map((value, index) => ({
    x: left + (index * (width - left - right)) / Math.max(1, values.length - 1),
    y: y(value), value
  }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const thresholdY = y(dangerLimit);
  const latest = values.at(-1);
  return `<svg class="environment-radiation-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Space radiation history with danger limit">
    ${[.25,.5,.75].map(frac => `<line x1="${left}" x2="${width-right}" y1="${top+frac*(height-top-bottom)}" y2="${top+frac*(height-top-bottom)}" class="environment-gridline"/>`).join('')}
    <line x1="${left}" x2="${width-right}" y1="${thresholdY}" y2="${thresholdY}" class="environment-danger-limit"/>
    <text x="${width-right}" y="${Math.max(10, thresholdY-5)}" text-anchor="end" class="environment-danger-label">DANGER LIMIT ${dangerLimit.toFixed(2)} µSv/h</text>
    <path d="${path}" class="environment-radiation-line"/>
    <circle cx="${points.at(-1).x}" cy="${points.at(-1).y}" r="5" class="environment-radiation-point"/>
    <text x="${left}" y="${height-3}" class="environment-axis-label">EARLIER DAYS</text>
    <text x="${width-right}" y="${height-3}" text-anchor="end" class="environment-axis-label">LATEST DAY</text>
  </svg>`;
}

function valueCard(label, value, unit, note, status = 'normal', symbol = '') {
  const isAlert = status !== 'normal';
  return `<article class="environment-value-card environment-value-card--${escapeHTML(status)}">
    <div class="environment-value-card__top"><span>${escapeHTML(label)}</span><span>${escapeHTML(symbol || (isAlert ? '!' : '●'))}</span></div>
    <div class="environment-value-card__value">${escapeHTML(value)}<small>${escapeHTML(unit)}</small></div>
    <div class="environment-value-card__note">${escapeHTML(note)}</div>
  </article>`;
}

export function environmentPage({ environment, history, date, daysElapsed }) {
  const e = environment;
  const radiationDanger = Number(e.radiation.value) >= Number(e.radiation.dangerLimit);
  const cabin = e.cabin;
  const cabinAlerts = [
    cabin.temperature.value < cabin.temperature.lower || cabin.temperature.value > cabin.temperature.upper,
    cabin.pressure.value < cabin.pressure.lower || cabin.pressure.value > cabin.pressure.upper,
    cabin.oxygen.value < cabin.oxygen.lower || cabin.oxygen.value > cabin.oxygen.upper,
    cabin.co2.value > cabin.co2.upper,
    cabin.humidity.value < cabin.humidity.lower || cabin.humidity.value > cabin.humidity.upper
  ].filter(Boolean).length;
  const conclusion = radiationDanger || cabinAlerts
    ? 'ENVIRONMENTAL REVIEW REQUIRED'
    : 'WITHIN CONFIGURED DEMO ENVELOPE';
  const severity = radiationDanger ? 'critical' : cabinAlerts ? 'warning' : 'normal';
  const gravityValue = Number(e.gravityG) === 0 ? 'NONE' : `${Number(e.gravityG).toFixed(3)} g`;
  return `
    <section class="page-header environment-page-header">
      <div><div class="eyebrow">EXPEDITION 07 <span>·</span> FLIGHT CONDITIONS</div><h1>Environment</h1><p class="page-subtitle">Spacecraft and external environment telemetry · illustrative demo values</p></div>
      <div class="header-date"><span>${icon('activity', 15)}</span><div><b>MISSION DAY ${String(daysElapsed + 1).padStart(2, '0')}</b><small>${escapeHTML(date)}</small></div></div>
    </section>
    <section class="environment-space-grid">
      <article class="environment-radiation-panel panel ${radiationDanger ? 'environment-radiation-panel--alert' : ''}">
        <div class="environment-panel-heading"><div><div class="eyebrow">EXTERNAL ENVIRONMENT</div><h2>Space radiation</h2></div><span class="environment-status-pill environment-status-pill--${radiationDanger ? 'critical' : 'normal'}">${radiationDanger ? 'DANGER LIMIT CROSSED' : 'WITHIN DEMO LIMIT'}</span></div>
        <div class="environment-radiation-current"><strong>${Number(e.radiation.value).toFixed(2)}</strong><span>µSv/h</span><small>Current radiation level</small></div>
        ${radiationGraph(history.radiation, Number(e.radiation.dangerLimit))}
        <div class="environment-graph-foot"><span>UPPER DANGER LIMIT</span><b>${Number(e.radiation.dangerLimit).toFixed(2)} µSv/h</b></div>
      </article>
      <div class="environment-space-facts">
        ${valueCard('DISTANCE FROM EARTH', Math.round(e.distanceEarthKm).toLocaleString(), 'km', 'Estimated spacecraft distance', 'normal', '◎')}
        ${valueCard('GRAVITY', gravityValue, '', Number(e.gravityG) === 0 ? 'Microgravity / no local gravity reading' : 'Current gravitational field', 'normal', '↘')}
      </div>
    </section>
    <section class="environment-cabin-section">
      <div class="section-heading"><div><div class="eyebrow">INTERNAL ENVIRONMENT</div><h2>Spacecraft cabin conditions</h2></div><span class="subtle-chip">5 MEASUREMENTS</span></div>
      <div class="environment-cabin-grid">
        ${valueCard('CABIN TEMPERATURE', Number(cabin.temperature.value).toFixed(1), '°C', `Demo range ${cabin.temperature.lower}–${cabin.temperature.upper} °C`, cabin.temperature.value < cabin.temperature.lower || cabin.temperature.value > cabin.temperature.upper ? 'warning' : 'normal', '⌁')}
        ${valueCard('CABIN PRESSURE', Number(cabin.pressure.value).toFixed(1), 'kPa', `Demo range ${cabin.pressure.lower}–${cabin.pressure.upper} kPa`, cabin.pressure.value < cabin.pressure.lower || cabin.pressure.value > cabin.pressure.upper ? 'warning' : 'normal', '◉')}
        ${valueCard('OXYGEN', Number(cabin.oxygen.value).toFixed(1), '%', `Demo range ${cabin.oxygen.lower}–${cabin.oxygen.upper}%`, cabin.oxygen.value < cabin.oxygen.lower || cabin.oxygen.value > cabin.oxygen.upper ? 'warning' : 'normal', 'O₂')}
        ${valueCard('CARBON DIOXIDE', Math.round(cabin.co2.value).toLocaleString(), 'ppm', `Demo upper limit ${cabin.co2.upper} ppm`, cabin.co2.value > cabin.co2.upper ? 'warning' : 'normal', 'CO₂')}
        ${valueCard('HUMIDITY', Math.round(cabin.humidity.value), '%', `Demo range ${cabin.humidity.lower}–${cabin.humidity.upper}%`, cabin.humidity.value < cabin.humidity.lower || cabin.humidity.value > cabin.humidity.upper ? 'warning' : 'normal', '≈')}
      </div>
    </section>
    <section class="environment-conclusion environment-conclusion--${severity} panel">
      <div class="environment-conclusion__icon">${icon(severity === 'normal' ? 'shield' : 'warning', 20)}</div>
      <div><div class="eyebrow">ENVIRONMENTAL CONCLUSION</div><h2>${conclusion}</h2><p>${severity === 'normal' ? 'Current illustrative spacecraft and external readings are within the configured demo ranges.' : `${radiationDanger ? 'Space radiation is above its configured demo danger limit. ' : ''}${cabinAlerts ? `${cabinAlerts} cabin measurement${cabinAlerts === 1 ? '' : 's'} need review.` : ''}`}</p></div>
    </section>
    <div class="demo-note"><span>${icon('shield', 14)}</span><p><b>Simulation notice:</b> All values, danger limits and conclusions are synthetic examples for interface testing. They are not spacecraft operating limits or safety guidance.</p></div>`;
}
