// Public API of the file-directory function.
//   importFiles(items, known)  read + convert every file, returns what *would* be added
//   loadExtras(raw)            used by src/data/store.js at startup: adds real_data/ and saved imports to data/*.json
import { validateData } from '../src/data/validate.js';
import { readItem } from './readers.js';
import { convertText } from './converters.js';
import { mergeData, bundleToData, emptyData } from './merge.js';

export { collectDropped, collectPicked, readItem, kindOf } from './readers.js';
export { convertText, toISODate } from './converters.js';
export { mergeData, bundleToData, emptyData } from './merge.js';

export const OVERLAY_KEY = 'orbit-health-file-directory-v1';
export function loadOverlay() {
  try { const d = JSON.parse(localStorage.getItem(OVERLAY_KEY) || 'null'); return d?.astronauts && d?.metrics && d?.health ? d : null; } catch { return null; }
}
export function saveOverlay(data) { try { localStorage.setItem(OVERLAY_KEY, JSON.stringify(data)); return true; } catch { return false; } }
export function clearOverlay() { try { localStorage.removeItem(OVERLAY_KEY); } catch { /* storage unavailable */ } }

/** Read and convert every item. Nothing is applied: the result is a preview. */
export async function importFiles(items, known) {
  const files = [];
  let staged = emptyData();
  for (const item of items) {
    const rec = await readItem(item);
    if (rec.text != null) {
      const view = mergeData(known, staged).data; // so file 2 can refer to crew/metrics created by file 1
      const { bundle, report } = convertText(rec.name, rec.text, view);
      const merged = mergeData(staged, bundleToData(bundle), { partial: true });
      staged = merged.data;
      rec.report = { ...report, warnings: [...report.warnings, ...merged.report.warnings] };
      rec.status = report.error ? 'error' : report.readings ? 'converted' : 'empty';
    } else {
      rec.report = { warnings: [] };
      rec.status = rec.error ? 'error' : rec.kind === 'data' ? 'unsupported' : 'stored';
    }
    files.push(rec);
  }
  return { files, staged };
}

const countReadings = (d) => Object.values(d.health).reduce((n, h) => n + Object.values(h.readings || {}).reduce((m, s) => m + s.length, 0), 0);

/**
 * Startup merge. Never throws: a broken extra data set is reported in `notes` and skipped.
 * @returns { data, preOverlay, notes }  data = everything shown; preOverlay = data/*.json + real_data/ only
 */
export async function loadExtras(raw) {
  let data = raw;
  const notes = [{ source: 'data', title: 'Core data (data/*.json)', astronauts: raw.astronauts.length, metrics: raw.metrics.metrics.length, readings: countReadings(raw) }];
  const accept = (merged, note) => {
    const problems = validateData(merged);
    if (problems.length) { console.warn(`[file_directory] "${note.title}" skipped:\n- ${problems.join('\n- ')}`); notes.push({ ...note, skipped: true, problems: problems.slice(0, 3) }); return; }
    data = merged; notes.push(note);
  };
  try {
    const res = await fetch(new URL('../real_data/manifest.json', import.meta.url));
    if (res.ok) {
      for (const ds of (await res.json()).datasets || []) {
        if (ds.enabled === false) continue;
        const note = { source: 'real_data', id: ds.id, title: ds.title || ds.id };
        try {
          const read = async (f) => { const r = await fetch(new URL(`../real_data/${f}`, import.meta.url)); if (!r.ok) throw new Error(`real_data/${f}: HTTP ${r.status}`); return r.json(); };
          const add = { astronauts: await read(ds.files.astronauts), metrics: await read(ds.files.metrics), health: await read(ds.files.health) };
          const { data: merged, report } = mergeData(data, add);
          accept(merged, { ...note, astronauts: report.astronauts, metrics: report.metrics, readings: report.readings });
        } catch (e) { console.warn(`[file_directory] ${note.title}:`, e); notes.push({ ...note, skipped: true, problems: [e.message] }); }
      }
    }
  } catch { /* no real_data/manifest.json: nothing extra to load */ }

  const preOverlay = data, overlay = loadOverlay();
  if (overlay) {
    try {
      const { data: merged, report } = mergeData(data, overlay);
      accept(merged, { source: 'imported', title: 'Imported with the File directory page', astronauts: report.astronauts, metrics: report.metrics, readings: report.readings });
    } catch (e) { console.warn('[file_directory] saved import skipped:', e); }
  }
  return { data, preOverlay, notes };
}
