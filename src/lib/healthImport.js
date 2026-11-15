// Turns a merged CSV (headers + rows, see csv.js) into updated astronauts/health data.
// Pure: no DOM, no storage. Nothing is applied here; the caller decides after showing the summary.
//
// Long format, one reading per row:
//   astronaut_id,astronaut_name,role,date,metric,value,systolic,diastolic
//   elena-voss,,,2026-11-16,heart-rate,76,,
//   elena-voss,,,2026-11-16,blood-pressure,,118,76
//   new-person,Sam Lee,Medic,2026-11-16,mood,Steady,,
// Required columns: astronaut_id, date, metric. Optional: astronaut_name (needed for a NEW astronaut), role, value, systolic, diastolic.
import { validateData } from '../data/validate.js';

export const IMPORT_COLUMNS = ['astronaut_id', 'astronaut_name', 'role', 'date', 'metric', 'value', 'systolic', 'diastolic'];
export const MOODS = ['Great', 'Steady', 'Low', 'Strained'];
export const TEMPLATE_ROWS = [
  ['elena-voss', '', '', '2026-11-16', 'heart-rate', '76', '', ''],
  ['elena-voss', '', '', '2026-11-16', 'blood-pressure', '', '118', '76'],
  ['elena-voss', '', '', '2026-11-16', 'mood', 'Steady', '', ''],
  ['sam-lee', 'Sam Lee', 'Medical officer', '2026-11-16', 'heart-rate', '72', '', ''],
];

const MAX_REPORTED = 100;
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NUM_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s) => {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function sameValue(a, b) {
  return typeof a === 'object' && a ? a.systolic === b.systolic && a.diastolic === b.diastolic : a === b;
}

/**
 * @param {{headers:string[], rows:string[][]}} table merged CSV
 * @param {{astronauts:object[], metrics:object, health:object}} current existing data (not mutated)
 * @returns {{ok:boolean, errors:string[], truncated:number, summary:object|null, next:{astronauts:object[], health:object}|null}}
 */
export function buildHealthImport(table, current) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  const headers = (table?.headers || []).map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, headers.indexOf(c)]));
  const unknownCols = headers.filter((h) => !IMPORT_COLUMNS.includes(h));
  for (const c of ['astronaut_id', 'date', 'metric']) if (col[c] < 0) fail(`Missing required column "${c}". Expected columns: ${IMPORT_COLUMNS.join(', ')}.`);
  if (unknownCols.length) fail(`Unknown column(s): ${unknownCols.join(', ')}. Expected columns: ${IMPORT_COLUMNS.join(', ')}.`);
  const rows = (table?.rows || []).map((r, i) => ({ r, line: i + 2 })).filter(({ r }) => r.some((v) => v.trim() !== ''));
  if (!errors.length && !rows.length) fail('The CSV has no data rows.');
  if (errors.length) return finish(errors, null, null);

  const metricDefs = current.metrics.metrics;
  const byKey = new Map();
  for (const m of metricDefs) { byKey.set(m.id.toLowerCase(), m); byKey.set(m.name.toLowerCase(), m); }
  const astronauts = structuredClone(current.astronauts);
  const health = structuredClone(current.health);
  const known = new Map(astronauts.map((a) => [a.id, a]));
  const newcomers = new Map(); // id -> {name, role, line}
  const seen = new Set();
  const stats = new Map(); // id -> {added, overwritten, unchanged}
  const defaultAstro = astronauts.find((a) => a.default);

  const get = (r, c) => (col[c] < 0 ? '' : (r[col[c]] ?? '').trim());
  const incoming = [];

  for (const { r, line } of rows) {
    const bad = (msg) => fail(`Row ${line}: ${msg}`);
    const before = errors.length;
    const id = get(r, 'astronaut_id').toLowerCase();
    const date = get(r, 'date');
    const metricRaw = get(r, 'metric');
    const name = get(r, 'astronaut_name');
    const role = get(r, 'role');
    const def = byKey.get(metricRaw.toLowerCase());

    if (!id) bad('astronaut_id is empty.');
    else if (!ID_RE.test(id)) bad(`astronaut_id "${id}" must be lowercase letters, digits and hyphens (e.g. "sam-lee").`);
    if (!validDate(date)) bad(`date "${date}" must be a real date as YYYY-MM-DD.`);
    if (!metricRaw) bad('metric is empty.');
    else if (!def) bad(`unknown metric "${metricRaw}". Known metrics: ${metricDefs.map((m) => m.id).join(', ')}.`);

    let value;
    if (def) {
      const v = get(r, 'value'), sys = get(r, 'systolic'), dia = get(r, 'diastolic');
      if (def.kind === 'blood-pressure') {
        if (v) bad(`${def.id} takes systolic and diastolic, not "value".`);
        if (!NUM_RE.test(sys) || !NUM_RE.test(dia)) bad(`${def.id} needs numeric systolic and diastolic.`);
        else if (Number(sys) <= 0 || Number(dia) <= 0 || Number(dia) >= Number(sys)) bad(`${def.id} needs positive numbers with diastolic lower than systolic (got ${sys}/${dia}).`);
        else value = { systolic: Number(sys), diastolic: Number(dia) };
      } else {
        if (sys || dia) bad(`${def.id} takes "value" only; systolic/diastolic must be empty.`);
        if (def.kind === 'mood') {
          const mood = MOODS.find((m) => m.toLowerCase() === v.toLowerCase());
          if (!mood) bad(`${def.id} must be one of ${MOODS.join(', ')} (got "${v}").`);
          else value = mood;
        } else if (!NUM_RE.test(v) || Number(v) <= 0) bad(`${def.id} must be a positive number (got "${v}").`);
        else value = Number(v);
      }
    }

    if (id && ID_RE.test(id) && !known.has(id)) {
      const n = newcomers.get(id);
      if (!n) newcomers.set(id, { name, role, line });
      else {
        if (name && n.name && name !== n.name) bad(`astronaut_name "${name}" conflicts with "${n.name}" given for "${id}" earlier.`);
        if (!n.name && name) n.name = name;
        if (!n.role && role) n.role = role;
      }
    }

    if (id && def && validDate(date)) {
      const key = `${id}|${def.id}|${date}`;
      if (seen.has(key)) bad(`duplicate reading for ${id} / ${def.id} / ${date}.`);
      seen.add(key);
    }
    if (errors.length === before) incoming.push({ id, date, def, value });
  }

  for (const [id, n] of newcomers) if (!n.name) fail(`Row ${n.line}: "${id}" is a new astronaut, so astronaut_name is required.`);
  if (errors.length) return finish(errors, null, null);

  const created = [];
  for (const [id, n] of newcomers) {
    astronauts.push({ id, name: n.name, initials: initialsOf(n.name), avatar: '🧑🏻‍🚀', role: n.role || 'Crew member', description: 'A member of the expedition crew.' });
    health[id] = { link: { signal: 92, connectivity: 'connected' }, waveform: [...health[defaultAstro.id].waveform], readings: {} };
    created.push(id);
  }

  for (const { id, date, def, value } of incoming) {
    const s = stats.get(id) || { added: 0, overwritten: 0, unchanged: 0 };
    stats.set(id, s);
    const series = (health[id].readings[def.id] ||= []);
    const at = series.findIndex((x) => x.date === date);
    if (at >= 0) {
      if (sameValue(series[at].value, value)) s.unchanged += 1;
      else { series[at] = { date, value }; s.overwritten += 1; } // replacing drops any stale severity/label on that reading
    } else { series.push({ date, value }); s.added += 1; }
  }
  for (const h of Object.values(health)) for (const series of Object.values(h.readings)) series.sort((a, b) => (a.date < b.date ? -1 : 1));

  // Safety net: the same validator the app runs at startup must accept the result.
  const problems = validateData({ astronauts, metrics: current.metrics, health });
  if (problems.length) return finish(problems.map((p) => `Resulting data is invalid: ${p}`), null, null);

  const names = new Map(astronauts.map((a) => [a.id, a.name]));
  const summary = {
    readings: incoming.length,
    added: [...stats.values()].reduce((t, s) => t + s.added, 0),
    overwritten: [...stats.values()].reduce((t, s) => t + s.overwritten, 0),
    unchanged: [...stats.values()].reduce((t, s) => t + s.unchanged, 0),
    newAstronauts: created.map((id) => names.get(id)),
    perAstronaut: [...stats].map(([id, s]) => ({ id, name: names.get(id), isNew: created.includes(id), isDefault: !!astronauts.find((a) => a.id === id)?.default, ...s })),
  };
  return finish([], summary, { astronauts, health });

  function finish(errs, summary2, next) {
    return { ok: errs.length === 0, errors: errs.slice(0, MAX_REPORTED), truncated: Math.max(0, errs.length - MAX_REPORTED), summary: summary2, next };
  }
}
