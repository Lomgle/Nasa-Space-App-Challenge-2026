// Reads dropped/picked files, extracts health readings from CSV/JSON, and applies them to dashboard metrics.
import { formatMetricValue, createLogEntry } from './health.js';

const MOODS = ['Strained', 'Low', 'Steady', 'Great'];
const BP = /^(\d{2,3})\s*\/\s*(\d{2,3})$/;
const COLORS = ['cyan', 'violet', 'amber', 'teal', 'indigo', 'green'];
const ALIASES = { 'blood-pressure': ['bp'], 'heart-rate': ['hr', 'pulse', 'bpm'], 'blood-sugar': ['glucose', 'blood glucose'], temperature: ['temp', 'body temp'], sleep: ['sleep hours'], 'muscle-mass': ['lean mass'], hydration: ['water', 'fluid intake'] };
const EXT = { data: ['csv', 'tsv', 'json', 'xlsx', 'xls'], doc: ['txt', 'md', 'pdf', 'doc', 'docx'], image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] };
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const extOf = name => (name.split('.').pop() || '').toLowerCase();
const isNum = v => v !== '' && (Number.isFinite(Number(v)) || BP.test(v));

export const fileKind = name => Object.keys(EXT).find(k => EXT[k].includes(extOf(name))) || 'other';

function trendNum(v) {
  const s = String(v).trim(), bp = s.match(BP), mood = MOODS.findIndex(m => m.toLowerCase() === s.toLowerCase());
  return bp ? +bp[1] : mood >= 0 ? mood + 1 : Number(s);
}
const series = (name, vals, unit = '') => ({ name, unit, value: vals.at(-1), trend: vals.map(trendNum).filter(Number.isFinite) });

export function parseCSV(text) {
  const first = text.split(/\r?\n/, 1)[0];
  const delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function fromCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const head = rows[0].map(h => h.trim()), low = head.map(norm);
  const body = rows.slice(1).filter(r => r.some(c => c.trim()));
  const ni = low.findIndex(h => ['metric', 'name', 'measurement', 'reading'].includes(h)), vi = low.indexOf('value'), ui = low.indexOf('unit');
  if (ni >= 0 && vi >= 0) { // long format: metric,value[,unit]
    const groups = new Map();
    body.forEach(r => {
      const n = r[ni]?.trim(); if (!n) return;
      const g = groups.get(n) || { unit: ui >= 0 ? r[ui]?.trim() : '', vals: [] };
      g.vals.push(r[vi]?.trim()); groups.set(n, g);
    });
    return [...groups].map(([n, g]) => series(n, g.vals, g.unit));
  }
  return head.flatMap((h, i) => { // wide format: one column per metric, one row per reading
    if (!h || /^(date|time|timestamp|day|id|index)$/i.test(h)) return [];
    const vals = body.map(r => r[i]?.trim()).filter(v => v !== undefined && v !== '');
    if (!vals.length || vals.filter(isNum).length < vals.length * 0.8) return [];
    const m = h.match(/^(.*?)\s*[(\[]([^)\]]*)[)\]]$/);
    return [series(m ? m[1] : h, vals, m ? m[2] : '')];
  });
}

function fromJSON(d) {
  const list = Array.isArray(d) ? d : Array.isArray(d?.metrics) ? d.metrics : null;
  const entries = list
    ? list.map(o => ({ name: o?.name ?? o?.metric ?? o?.id, value: o?.value, unit: o?.unit, lower: o?.lower ?? o?.min, upper: o?.upper ?? o?.max,
        trend: (Array.isArray(o?.trend) ? o.trend : []).map(Number).filter(Number.isFinite) }))
    : Object.entries(d?.metrics ?? d ?? {}).map(([name, v]) => Array.isArray(v)
        ? { name, value: v.at(-1), trend: v.map(trendNum).filter(Number.isFinite) }
        : { name, value: v?.systolic ? `${v.systolic}/${v.diastolic}` : v, trend: [] });
  return entries.filter(e => e.name && ['number', 'string'].includes(typeof e.value) && e.value !== '');
}

export async function analyzeFile(file) {
  const ext = extOf(file.name);
  let entries = [];
  try {
    if (['csv', 'tsv', 'json'].includes(ext) && file.size <= 2e6) {
      const text = await file.text();
      entries = ext === 'json' ? fromJSON(JSON.parse(text)) : fromCSV(text);
    }
  } catch { /* unreadable or malformed: keep the file in the directory without readings */ }
  return { kind: fileKind(file.name), entries };
}

// Directory access: dropped folders are walked recursively; picked folders carry webkitRelativePath.
async function walk(entry, base = '') {
  if (entry.isFile) return [{ file: await new Promise((res, rej) => entry.file(res, rej)), path: base + entry.name }];
  const reader = entry.createReader(), all = [];
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    all.push(...batch);
  }
  return (await Promise.all(all.map(e => walk(e, `${base}${entry.name}/`)))).flat();
}
export async function collectDropped(dt) {
  const entries = [...dt.items].map(i => i.webkitGetAsEntry?.()).filter(Boolean); // read before any await
  if (!entries.length) return [...dt.files].map(file => ({ file, path: file.name }));
  return (await Promise.all(entries.map(e => walk(e)))).flat();
}
export const collectPicked = files => [...files].map(file => ({ file, path: file.webkitRelativePath || file.name }));

function matchId(name, metrics) {
  const n = norm(name);
  return metrics.find(m => norm(m.id) === n || norm(m.name) === n || ALIASES[m.id]?.includes(n))?.id;
}

export function importEntries(metrics, log, entries, source) {
  const out = { ids: [], created: 0, updated: 0, skipped: 0 };
  for (const e of entries) {
    let m = metrics.find(x => x.id === matchId(e.name, metrics));
    const text = String(e.value).trim(), num = Number(text), bp = text.match(BP);
    const hist = (e.trend || []).filter(Number.isFinite);
    let next, point;
    if (m?.kind === 'blood-pressure') { if (!bp) { out.skipped++; continue; } next = { systolic: +bp[1], diastolic: +bp[2] }; point = next.systolic; }
    else if (m?.kind === 'mood') {
      next = MOODS.find(x => x.toLowerCase() === text.toLowerCase()) || MOODS[num - 1];
      if (!next) { out.skipped++; continue; } point = MOODS.indexOf(next) + 1;
    } else {
      if (text === '' || !Number.isFinite(num)) { out.skipped++; continue; } next = point = num;
    }
    let previous = '—';
    if (m) {
      previous = formatMetricValue(m); m.value = next;
      m.trend = hist.length > 1 ? hist.slice(-18) : [...(m.trend || []), point].slice(-18);
      m.updated = 'Just now';
      if (m.id === 'temperature') m.dailyAverage = num;
      out.updated++;
    } else {
      const lower = Number(e.lower), upper = Number(e.upper), thresholds = [];
      if (e.lower != null && Number.isFinite(lower)) thresholds.push({ field: 'value', operator: 'lt', value: lower, severity: 'warning', label: 'Below imported limit' });
      if (e.upper != null && Number.isFinite(upper)) thresholds.push({ field: 'value', operator: 'gt', value: upper, severity: 'warning', label: 'Above imported limit' });
      m = { id: `import-${norm(e.name).replace(/ /g, '-')}`, name: String(e.name).trim(), unit: e.unit || '', value: num, kind: 'number', category: 'Other',
        icon: 'activity', color: COLORS[metrics.length % COLORS.length], subtitle: `Imported from ${source}`, updated: 'Just now',
        trend: hist.length > 1 ? hist.slice(-18) : [num], chartType: 'line', thresholds, isCustom: true };
      metrics.push(m); out.created++;
    }
    log.push(createLogEntry(m, previous, formatMetricValue(m), `Imported from ${source}`));
    out.ids.push(m.id);
  }
  return out;
}