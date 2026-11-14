// Read-only data layer. Three files, all validated on load (src/data/validate.js):
//   data/astronauts.json  who they are (Elena = "default": true)
//   data/metrics.json     metric definitions + categories
//   data/health.json      per astronaut: link, waveform, dated readings per metric (oldest -> newest, last = current)
// Runtime edits and the daily simulation stay in the browser (localStorage); these files are never written.
import { formatMetricValue, evaluateMetric } from '../lib/health.js';
import { validateData } from './validate.js';

const load = async (name) => {
  const res = await fetch(new URL(`../../data/${name}.json`, import.meta.url));
  if (!res.ok) throw new Error(`data/${name}.json: HTTP ${res.status}`);
  try { return await res.json(); } catch { throw new Error(`data/${name}.json: not valid JSON`); }
};
const [astronauts, metrics, health] = await Promise.all(['astronauts', 'metrics', 'health'].map(load));
const problems = validateData({ astronauts, metrics, health });
if (problems.length) throw new Error(`Invalid data files:\n- ${problems.join('\n- ')}`);

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

export const ELENA = { ...getElena(), link: health[getElena().id].link, waveform: health[getElena().id].waveform };

// Elena's metric cards: definition + latest reading + day-by-day trend from her dated readings.
export const DEFAULT_METRICS = metrics.metrics.filter((def) => getHealth(ELENA.id, def.id)).map((def) => {
  const series = getHealth(ELENA.id, def.id);
  return { ...def, value: latest(series).value, trend: series.map((r) => trendValue(def, r.value)), updated: latest(series).date };
});

// "Crew summary": everyone else as a snapshot of their latest readings, in the shape the app already uses.
export const DEMO_CREW = astronauts.filter((a) => !a.default).map((a) => {
  const { link, statusLabel, readings } = health[a.id];
  const metricReadings = metrics.metrics.filter((def) => readings[def.id]).map((def) => {
    const last = latest(readings[def.id]);
    const ev = evaluateMetric({ ...def, value: last.value });
    const label = last.label || (ev.matches.length ? ev.label : undefined);
    return { id: def.id, name: def.name, value: text(def, last.value), severity: last.severity || ev.severity, ...(label ? { label } : {}) };
  });
  const status = metricReadings.some((r) => r.severity === 'critical') ? 'critical' : metricReadings.some((r) => r.severity === 'warning') ? 'warning' : 'normal';
  const hr = metricReadings.find((r) => r.id === 'heart-rate');
  return {
    ...a, signal: link.signal, connectivity: link.connectivity, waveform: health[a.id].waveform,
    status, emergency: status === 'critical',
    statusLabel: statusLabel || (status === 'critical' ? 'Emergency review' : status === 'warning' ? 'Needs review' : 'Within demo ranges'),
    heartRate: hr ? Number.parseInt(hr.value, 10) : null,
    metricReadings, readings: metricReadings.map((r) => [r.name, r.value])
  };
});
