// Pure checks (no browser/Node APIs) so the app and scripts/validate-data.mjs share them. Returns a list of problems.
const KINDS = ['number', 'blood-pressure', 'mood'];
const SEVERITIES = ['normal', 'warning', 'critical'];
const LINKS = ['connected', 'weak', 'offline'];
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function validValue(kind, v) {
  if (kind === 'blood-pressure') return !!v && isNum(v.systolic) && isNum(v.diastolic);
  if (kind === 'mood') return isStr(v);
  return isNum(v);
}

export function validateData({ astronauts, metrics, health }) {
  const errs = [];
  const err = (m) => errs.push(m);
  if (!Array.isArray(astronauts) || !astronauts.length) return ['astronauts.json: must be a non-empty array'];
  if (!Array.isArray(metrics?.metrics) || !Array.isArray(metrics?.categories)) return ['metrics.json: needs "categories" and "metrics" arrays'];
  if (!health || typeof health !== 'object' || Array.isArray(health)) return ['health.json: must be an object keyed by astronaut id'];

  const ids = new Set();
  for (const a of astronauts) {
    if (!isStr(a?.id) || !isStr(a.name) || !isStr(a.initials) || !isStr(a.role)) { err(`astronauts.json: entry needs id, name, initials, role (${JSON.stringify(a?.id)})`); continue; }
    if (ids.has(a.id)) err(`astronauts.json: duplicate id "${a.id}"`);
    ids.add(a.id);
  }
  const defaults = astronauts.filter((a) => a?.default === true);
  if (defaults.length !== 1) err(`astronauts.json: exactly one astronaut must have "default": true (found ${defaults.length})`);

  const kindOf = new Map();
  for (const m of metrics.metrics) {
    if (!isStr(m?.id) || !isStr(m.name) || !KINDS.includes(m.kind)) { err(`metrics.json: metric needs id, name and kind ${KINDS.join('/')} (${JSON.stringify(m?.id)})`); continue; }
    if (kindOf.has(m.id)) err(`metrics.json: duplicate metric id "${m.id}"`);
    kindOf.set(m.id, m.kind);
  }

  for (const id of Object.keys(health)) if (!ids.has(id)) err(`health.json: "${id}" is not in astronauts.json`);
  for (const id of ids) {
    const h = health[id];
    if (!h) { err(`health.json: missing entry for "${id}"`); continue; }
    const at = `health.json[${id}]`;
    if (!isNum(h.link?.signal) || h.link.signal < 0 || h.link.signal > 100 || !LINKS.includes(h.link.connectivity)) err(`${at}.link: needs signal 0-100 and connectivity ${LINKS.join('/')}`);
    if (!Array.isArray(h.waveform) || !h.waveform.every(isNum)) err(`${at}.waveform: must be an array of numbers`);
    const entries = Object.entries(h.readings || {});
    if (!entries.length) err(`${at}.readings: must have at least one metric`);
    for (const [metricId, series] of entries) {
      const kind = kindOf.get(metricId);
      if (!kind) { err(`${at}.readings: unknown metric "${metricId}"`); continue; }
      if (!Array.isArray(series) || !series.length) { err(`${at}.readings.${metricId}: must be a non-empty array`); continue; }
      series.forEach((r, i) => {
        const where = `${at}.readings.${metricId}[${i}]`;
        if (!isDate(r?.date)) err(`${where}: date must be YYYY-MM-DD`);
        else if (i && isDate(series[i - 1].date) && r.date <= series[i - 1].date) err(`${where}: dates must be strictly oldest -> newest`);
        if (!validValue(kind, r?.value)) err(`${where}: value is not valid for kind "${kind}"`);
        if (r?.severity !== undefined && !SEVERITIES.includes(r.severity)) err(`${where}: severity must be ${SEVERITIES.join('/')}`);
      });
    }
  }
  return errs;
}
