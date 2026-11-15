// Combine data sets without ever overwriting what is already there (existing astronaut / metric definitions win).
// Readings are merged by date: same day -> the newer file wins.
import { validateData } from '../src/data/validate.js';

export const emptyData = () => ({ astronauts: [], metrics: { categories: [], metrics: [] }, health: {} });
export const bundleToData = (b) => ({ astronauts: b.astronauts || [], metrics: { categories: b.categories || [], metrics: b.metrics || [] }, health: b.health || {} });

/**
 * @param base    { astronauts, metrics: {categories, metrics}, health }
 * @param add     same shape
 * @param opts    validate: run src/data/validate.js on the result and throw if it is invalid
 *                partial:  `base` is only a chunk (e.g. the saved import), so unknown ids are kept for later
 */
export function mergeData(base, add, { validate = false, partial = false } = {}) {
  const out = structuredClone(base), report = { astronauts: 0, metrics: 0, readings: 0, warnings: [] };
  const warn = (m) => report.warnings.push(m);

  for (const c of add.metrics?.categories || []) if (!out.metrics.categories.includes(c)) out.metrics.categories.push(c);
  const kinds = new Map(out.metrics.metrics.map((m) => [m.id, m.kind]));
  const addKinds = new Map();
  for (const d of add.metrics?.metrics || []) {
    addKinds.set(d.id, d.kind);
    if (!kinds.has(d.id)) {
      out.metrics.metrics.push(structuredClone(d)); kinds.set(d.id, d.kind); report.metrics++;
      if (d.category && !out.metrics.categories.includes(d.category)) out.metrics.categories.push(d.category);
    } else if (kinds.get(d.id) !== d.kind) warn(`Metric "${d.id}" already exists with kind "${kinds.get(d.id)}"; the file's "${d.kind}" readings were skipped.`);
  }

  const have = new Set(out.astronauts.map((a) => a.id)), added = new Set();
  for (const a of add.astronauts || []) {
    if (have.has(a.id)) continue;
    const { default: _ignored, ...rest } = a; // an import can never take over the "default" astronaut
    out.astronauts.push(rest); have.add(a.id); added.add(a.id); report.astronauts++;
  }

  for (const [id, h] of Object.entries(add.health || {})) {
    if (!partial && !have.has(id)) { warn(`Readings for unknown astronaut "${id}" were ignored.`); continue; }
    const dst = (out.health[id] ??= { link: h.link ?? { signal: 0, connectivity: 'offline' }, waveform: h.waveform ?? [], ...(h.statusLabel ? { statusLabel: h.statusLabel } : {}), readings: {} });
    for (const [mid, series] of Object.entries(h.readings || {})) {
      const kind = kinds.get(mid);
      if (!partial && !kind) { warn(`Readings for unknown metric "${mid}" were ignored.`); continue; }
      if (kind && addKinds.has(mid) && addKinds.get(mid) !== kind) continue; // reported above
      const byDate = new Map([...(dst.readings[mid] || []), ...series].map((r) => [r.date, r]));
      dst.readings[mid] = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
      report.readings += series.length;
    }
  }
  if (!partial) { // a new astronaut without readings cannot be shown, so drop it
    for (const id of added) if (!Object.keys(out.health[id]?.readings || {}).length) {
      out.astronauts = out.astronauts.filter((a) => a.id !== id); delete out.health[id]; report.astronauts--; warn(`"${id}" had no usable readings and was not added.`);
    }
  }
  if (validate) {
    const problems = validateData(out);
    if (problems.length) throw new Error(`Merged data is invalid:\n- ${problems.join('\n- ')}`);
  }
  return { data: out, report };
}
