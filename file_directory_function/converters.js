// Any CSV / TSV / JSON file -> the exact shape of data/astronauts.json, data/metrics.json, data/health.json.
// Output "bundle": { astronauts: [...new], metrics: [...new definitions], categories: [...], health: { id: { readings } } }
import { parseCSV } from '../src/lib/csv.js';
import { norm, slug, MOODS, METRIC_ALIASES, roleOf, stripUnit } from './aliases.js';

const BP = /^(\d{2,3})\s*\/\s*(\d{2,3})$/;
const COLORS = ['cyan', 'violet', 'amber', 'teal', 'indigo', 'green', 'rose', 'blue'];
const DAY = 864e5;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const has = (v) => v != null && String(v).trim() !== '';

const ymd = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null;
};
/** YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY (day first) or "3 Nov 2026" -> YYYY-MM-DD, else null. */
export function toISODate(v) {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return ymd(+m[3], +m[2], +m[1]);
  const t = /[a-z]/i.test(s) ? Date.parse(s) : NaN;
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/** Raw cell -> a value valid for the metric kind (number | {systolic,diastolic} | mood label), or undefined. */
function coerce(kind, raw) {
  if (raw && typeof raw === 'object') {
    return kind === 'blood-pressure' && isNum(+raw.systolic) && isNum(+raw.diastolic) ? { systolic: +raw.systolic, diastolic: +raw.diastolic } : undefined;
  }
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  if (kind === 'blood-pressure') { const m = s.match(BP); return m ? { systolic: +m[1], diastolic: +m[2] } : undefined; }
  if (kind === 'mood') return MOODS.find((x) => x.toLowerCase() === s.toLowerCase()) ?? MOODS[Number(s) - 1];
  const n = /^[-+]?\d+([.,]\d+)?\s*[^\d\s]{0,6}$/.test(s) ? parseFloat(s.replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function resolvers(known) {
  const astros = known.astronauts.map((a) => ({ id: a.id, keys: [a.id, a.name, a.initials, String(a.name).split(' ')[0]].map(norm) }));
  const defs = known.metrics.metrics;
  return {
    astronaut: (who) => astros.find((a) => a.keys.includes(norm(who)))?.id,
    metric: (name) => { const n = norm(name); return defs.find((d) => norm(d.id) === n || norm(d.name) === n || METRIC_ALIASES[d.id]?.includes(n))?.id; }
  };
}

// ---------- 1. rows -> "facts" (one reading each, not yet matched to astronauts/metrics) ----------
function factsFromRecords(headers, records, res) {
  const roles = {};
  for (const h of headers) { const r = roleOf(h); if (r && !roles[r]) roles[r] = h; }
  const nameCol = headers.find((h) => norm(h) === 'name'); // ambiguous header: crew name or metric name
  if (nameCol) { if (roles.metric && !roles.astronaut) roles.astronaut = nameCol; else if (!roles.metric && roles.value) roles.metric = nameCol; }
  const at = (r, col) => (col ? r[col] : undefined);
  const facts = [];

  if (roles.metric && roles.value) { // long: one row per reading
    for (const r of records) facts.push({ who: at(r, roles.astronaut), name: r[roles.metric], unit: at(r, roles.unit), date: at(r, roles.date), value: r[roles.value] });
    return { facts, layout: 'long' };
  }
  // wide: one column per metric
  const used = new Set(Object.values(roles));
  const numericShare = (h) => { const v = records.map((r) => r[h]).filter(has); return v.length ? v.filter((x) => (x && typeof x === 'object') || Number.isFinite(parseFloat(String(x).replace(',', '.')))).length / v.length : 0; };
  const metricCols = headers.filter((h) => !used.has(h) && (res.metric(stripUnit(h).name) || numericShare(h) >= 0.5));
  for (const r of records) {
    const base = { who: at(r, roles.astronaut), date: at(r, roles.date) };
    if (roles.systolic && roles.diastolic) facts.push({ ...base, name: 'Blood pressure', unit: 'mmHg', value: { systolic: r[roles.systolic], diastolic: r[roles.diastolic] } });
    for (const h of metricCols) { const { name, unit } = stripUnit(h); facts.push({ ...base, name, unit, value: r[h] }); }
  }
  return { facts, layout: 'wide' };
}

/** "Systolic" + "Diastolic" rows of the same astronaut and date become one Blood pressure reading. */
function combineBP(facts) {
  const out = [], parts = new Map();
  for (const f of facts) {
    const n = norm(stripUnit(f.name).name);
    const side = ['systolic', 'systolic bp', 'sys'].includes(n) ? 'systolic' : ['diastolic', 'diastolic bp', 'dia'].includes(n) ? 'diastolic' : null;
    if (!side) { out.push(f); continue; }
    const key = `${f.who}|${f.date}`, p = parts.get(key) ?? { ...f, name: 'Blood pressure', unit: 'mmHg', value: {} };
    p.value[side] = f.value; parts.set(key, p);
  }
  return [...out, ...parts.values()];
}

const initialsOf = (name) => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'IM';

// ---------- 2. facts -> bundle in the three data files' format ----------
function toBundle(rawFacts, known, source) {
  const warnings = [], res = resolvers(known);
  const facts = combineBP(rawFacts);
  const kinds = new Map(known.metrics.metrics.map((d) => [d.id, d.kind]));
  const newAstro = new Map(), newDefs = new Map(), health = {};
  const undatedTotal = new Map(), undatedSeen = new Map();
  for (const f of facts) if (!has(f.date)) { const k = `${f.who}|${norm(f.name)}`; undatedTotal.set(k, (undatedTotal.get(k) || 0) + 1); }
  if (undatedTotal.size) warnings.push('Some rows had no date: they were given consecutive days ending today. Add a date column for exact dates.');

  let readings = 0, skipped = 0;
  for (const f of facts) {
    const who = has(f.who) ? String(f.who).trim() : 'Imported crew';
    const display = stripUnit(f.name).name;
    let date;
    if (has(f.date)) date = toISODate(f.date);
    else { const k = `${f.who}|${norm(f.name)}`, i = undatedSeen.get(k) || 0; undatedSeen.set(k, i + 1); date = new Date(Date.now() - (undatedTotal.get(k) - 1 - i) * DAY).toISOString().slice(0, 10); }

    let mid = res.metric(display);
    const value = coerce(mid ? kinds.get(mid) : 'number', f.value);
    if (!date || value === undefined || !display) { skipped++; continue; }

    let aid = res.astronaut(who);
    if (!aid) {
      aid = slug(who);
      if (!newAstro.has(aid)) newAstro.set(aid, { id: aid, name: who, initials: initialsOf(who), avatar: '🧑‍🚀', role: 'Imported data', description: `Imported from ${source}.`, archival: true });
    }
    if (!mid) {
      mid = slug(display);
      if (!newDefs.has(mid)) newDefs.set(mid, { id: mid, name: display, category: 'Other', kind: 'number', chartType: 'line', unit: String(f.unit ?? '').trim(), icon: 'activity', color: COLORS[newDefs.size % COLORS.length], subtitle: `Imported from ${source}`, thresholds: [] });
    }
    const h = (health[aid] ??= newAstro.has(aid)
      ? { link: { signal: 0, connectivity: 'offline' }, waveform: [], statusLabel: 'Imported data', readings: {} }
      : { readings: {} });
    (h.readings[mid] ??= []).push({ date, value });
    readings++;
  }
  if (skipped) warnings.push(`${skipped} value(s) skipped (missing, non-numeric for the metric, or invalid date).`);
  for (const h of Object.values(health)) { // oldest -> newest, one reading per day (last one wins)
    for (const [m, list] of Object.entries(h.readings)) h.readings[m] = [...new Map(list.map((r) => [r.date, r])).values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  return {
    bundle: { astronauts: [...newAstro.values()], metrics: [...newDefs.values()], categories: newDefs.size ? ['Other'] : [], health },
    report: { readings, skipped, astronauts: newAstro.size, metrics: newDefs.size, warnings }
  };
}

// ---------- 3. file formats ----------
const emptyBundle = () => ({ astronauts: [], metrics: [], categories: [], health: {} });
const failed = (msg) => ({ bundle: emptyBundle(), report: { format: 'unreadable', error: msg, readings: 0, skipped: 0, astronauts: 0, metrics: 0, warnings: [] } });

function fromRecords(headers, records, known, source, label) {
  const { facts, layout } = factsFromRecords(headers, records, resolvers(known));
  const out = toBundle(facts, known, source);
  out.report.format = `${label} · ${layout} layout`;
  return out;
}

function native(obj, label) { // already in Orbit Health format (e.g. a copy of the data/*.json files)
  if (obj.astronauts != null && !Array.isArray(obj.astronauts)) throw new Error('"astronauts" must be an array');
  const list = Array.isArray(obj.metrics) ? obj.metrics : obj.metrics?.metrics ?? [];
  const bundle = { astronauts: obj.astronauts ?? [], metrics: list, categories: obj.metrics?.categories ?? [], health: obj.health ?? {} };
  const readings = Object.values(bundle.health).reduce((n, h) => n + Object.values(h?.readings ?? {}).reduce((m, s) => m + s.length, 0), 0);
  return { bundle, report: { format: label, readings, skipped: 0, astronauts: bundle.astronauts.length, metrics: list.length, warnings: [] } };
}

const looksLikeAstronaut = (o) => o && typeof o === 'object' && o.id && o.name && (o.role || o.initials);

function fromJSON(obj, known, source) {
  if (Array.isArray(obj)) {
    if (obj.length && obj.every(looksLikeAstronaut)) return native({ astronauts: obj }, 'astronaut list');
    const records = obj.filter((o) => o && typeof o === 'object' && !Array.isArray(o));
    return fromRecords([...new Set(records.flatMap(Object.keys))], records, known, source, 'JSON records');
  }
  if (obj && typeof obj === 'object') {
    if (obj.astronauts || obj.metrics || obj.health) return native(obj, 'Orbit Health bundle');
    const vals = Object.values(obj);
    if (vals.length && vals.every((v) => v && typeof v === 'object' && 'readings' in v)) return native({ health: obj }, 'health data');
    const flat = Object.fromEntries(Object.entries(obj).filter(([, v]) => v == null || typeof v !== 'object' || (!Array.isArray(v) && 'systolic' in v)));
    return fromRecords(Object.keys(flat), [flat], known, source, 'JSON key/value');
  }
  throw new Error('JSON must be an object or an array.');
}

function fromCSV(text, known, source, tsv) {
  let headers, records;
  if (tsv) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    headers = (lines.shift() || '').split('\t').map((h) => h.trim());
    records = lines.map((l) => Object.fromEntries(l.split('\t').map((c, i) => [headers[i], c.trim()])));
  } else {
    const parsed = parseCSV(text);
    headers = parsed.headers;
    records = parsed.rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
  }
  return fromRecords(headers, records, known, source, tsv ? 'TSV' : 'CSV');
}

/**
 * @param name  file name (its extension picks the reader)
 * @param text  file contents
 * @param known the data already on the website: { astronauts, metrics: { categories, metrics }, health }
 * @returns { bundle, report }   report = { format, readings, skipped, astronauts, metrics, warnings, error? }
 */
export function convertText(name, text, known) {
  const ext = String(name).split('.').pop().toLowerCase();
  try {
    if (ext === 'json') return fromJSON(JSON.parse(text), known, name);
    if (ext === 'csv' || ext === 'tsv') return fromCSV(text, known, name, ext === 'tsv');
    return failed(`.${ext} files are not converted (use CSV, TSV or JSON).`);
  } catch (e) { return failed(e.message); }
}
