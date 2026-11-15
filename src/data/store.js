// Read-only data layer. Three files, all validated on load (src/data/validate.js):
//   data/astronauts.json  who they are (Elena = "default": true)
//   data/metrics.json     metric definitions + categories
//   data/health.json      per astronaut: link, waveform, dated readings per metric (oldest -> newest, last = current)
// Runtime edits and the daily simulation stay in the browser (localStorage); these files are never written.
// CSV imports (src/lib/healthImport.js) are saved as an override of astronauts + health in localStorage, which wins over the files
// above on every load. Factory reset removes the override, which restores the shipped files.
import { formatMetricValue, evaluateMetric } from '../lib/health.js';
import { validateData } from './validate.js';

const load = async (name) => {
  const res = await fetch(new URL(`../../data/${name}.json`, import.meta.url));
  if (!res.ok) throw new Error(`data/${name}.json: HTTP ${res.status}`);
  try { return await res.json(); } catch { throw new Error(`data/${name}.json: not valid JSON`); }
};
const [fileAstronauts, metrics, fileHealth] = await Promise.all(['astronauts', 'metrics', 'health'].map(load));
const problems = validateData({ astronauts: fileAstronauts, metrics, health: fileHealth });
if (problems.length) throw new Error(`Invalid data files:\n- ${problems.join('\n- ')}`);

export const DATA_OVERRIDE_KEY = 'orbit-health-data-override-v1';
let astronauts = fileAstronauts;
let health = fileHealth;
export let hasDataOverride = false;
try {
  const saved = JSON.parse(localStorage.getItem(DATA_OVERRIDE_KEY) || 'null');
  if (saved && !validateData({ astronauts: saved.astronauts, metrics, health: saved.health }).length) {
    astronauts = saved.astronauts; health = saved.health; hasDataOverride = true;
  }
} catch { /* unreadable override: fall back to the shipped files */ }

const MOOD_SCORE = { Great: 4, Steady: 3, Low: 2, Strained: 1 };
const latest = (series) => series[series.length - 1];
const trendValue = (def, value) => def.kind === 'blood-pressure' ? value.systolic : def.kind === 'mood' ? MOOD_SCORE[value] || 3 : Number(value);
const text = (def, value) => `${def.decimals ? Number(value).toFixed(def.decimals) : formatMetricValue({ ...def, value })}${def.unit ? ` ${def.unit}` : ''}`;

export const METRIC_CATEGORIES = metrics.categories;
export const getMetricDefs = () => metrics.metrics;
export const getAstronauts = () => astronauts;
export const getAstronaut = (id) => astronauts.find((a) => a.id === id);
export const getElena = () => astronauts.find((a) => a.default);
// Dated readings (oldest -> newest). Pass metricId for one metric, omit for all.
export const getHealth = (id, metricId) => metricId ? health[id]?.readings[metricId] : health[id]?.readings;

export const getMetricsDefinition = () => metrics;
export const getCurrentData = () => structuredClone({ astronauts, health });
/** Persist imported data (already validated by the caller) so it survives reloads. Returns false if storage is full/unavailable. */
export function saveDataOverride(data) {
  try { localStorage.setItem(DATA_OVERRIDE_KEY, JSON.stringify({ astronauts: data.astronauts, health: data.health })); return true; } catch { return false; }
}

export const ELENA = { ...getElena(), link: health[getElena().id].link, waveform: health[getElena().id].waveform };

const TREND_DAYS = 7; // Elena's charts show her last 7 readings; older ones are kept but not drawn

/** Dashboard shapes derived from astronauts + health: Elena's metric cards and everyone else's crew snapshot. */
export function buildDerived(astros, hlth) {
  const elena = astros.find((a) => a.default);
  const own = (metricId) => hlth[elena.id]?.readings[metricId];
  const defaultMetrics = metrics.metrics.filter((def) => own(def.id)).map((def) => {
    const series = own(def.id);
    return { ...def, value: latest(series).value, trend: series.slice(-TREND_DAYS).map((r) => trendValue(def, r.value)), updated: latest(series).date };
  });
  // "Crew summary": everyone else as a snapshot of their latest readings, in the shape the app already uses.
  const demoCrew = astros.filter((a) => !a.default).map((a) => {
    const { link, statusLabel, readings } = hlth[a.id];
    const metricReadings = metrics.metrics.filter((def) => readings[def.id]).map((def) => {
      const last = latest(readings[def.id]);
      const ev = evaluateMetric({ ...def, value: last.value });
      const label = last.label || (ev.matches.length ? ev.label : undefined);
      return { id: def.id, name: def.name, value: text(def, last.value), severity: last.severity || ev.severity, ...(label ? { label } : {}) };
    });
    const status = metricReadings.some((r) => r.severity === 'critical') ? 'critical' : metricReadings.some((r) => r.severity === 'warning') ? 'warning' : 'normal';
    const hr = metricReadings.find((r) => r.id === 'heart-rate');
    return {
      ...a, signal: link.signal, connectivity: link.connectivity, waveform: hlth[a.id].waveform,
      status, emergency: status === 'critical',
      statusLabel: statusLabel || (status === 'critical' ? 'Emergency review' : status === 'warning' ? 'Needs review' : 'Within demo ranges'),
      heartRate: hr ? Number.parseInt(hr.value, 10) : null,
      metricReadings, readings: metricReadings.map((r) => [r.name, r.value])
    };
  });
  return { defaultMetrics, demoCrew };
}

const derived = buildDerived(astronauts, health);
export const DEFAULT_METRICS = derived.defaultMetrics;
export const DEMO_CREW = derived.demoCrew;
