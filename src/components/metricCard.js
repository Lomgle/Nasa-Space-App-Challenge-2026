import { escapeHTML, icon } from '../lib/ui.js';
import { evaluateMetric, formatMetricValue } from '../lib/health.js';

function getLimits(metric) {
  const field = metric.kind === 'blood-pressure' ? 'systolic' : 'value';
  const rules = (metric.thresholds || []).filter(rule => rule.field === field && typeof rule.value === 'number');
  const lowerRule = rules.filter(rule => ['lt', 'lte'].includes(rule.operator)).sort((a, b) => b.value - a.value)[0];
  const upperRule = rules.filter(rule => ['gt', 'gte'].includes(rule.operator)).sort((a, b) => a.value - b.value)[0];
  if (metric.kind === 'mood') return { lower: 1, upper: 4, lowerLabel: 'LOW', upperLabel: 'GREAT' };
  return { lower: lowerRule?.value ?? metric.graphRange?.lower ?? null, upper: upperRule?.value ?? metric.graphRange?.upper ?? null };
}

function graphValues(metric) {
  if (metric.kind === 'blood-pressure') return (metric.trend || []).map(Number).filter(Number.isFinite);
  return (metric.trend || []).map(Number).filter(Number.isFinite);
}

export function metricGraph(metric) {
  const values = graphValues(metric);
  if (!values.length) return '<div class="metric-graph-empty">No trend data yet</div>';
  const limits = getLimits(metric);
  const minValue = Math.min(...values, limits.lower ?? Infinity);
  const maxValue = Math.max(...values, limits.upper ?? -Infinity);
  const padding = Math.max(metric.chartType === 'column' ? .2 : 1, (maxValue - minValue) * .16);
  const min = Number.isFinite(minValue) ? minValue - padding : Math.min(...values) - 1;
  const max = Number.isFinite(maxValue) ? maxValue + padding : Math.max(...values) + 1;
  const range = Math.max(.01, max - min);
  const width = 560, height = 94, left = 8, right = 8, top = 8, bottom = 8;
  const y = value => top + ((max - value) / range) * (height - top - bottom);
  const points = values.map((value, index) => ({
    x: left + (index * (width - left - right)) / Math.max(1, values.length - 1),
    y: y(value), value
  }));
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `${points[0].x},${height - bottom} ${line} ${points.at(-1).x},${height - bottom}`;
  const lowerLine = limits.lower !== null ? `<line x1="${left}" x2="${width-right}" y1="${y(limits.lower)}" y2="${y(limits.lower)}" class="metric-graph__limit metric-graph__limit--lower"/><text x="${width-right}" y="${Math.max(8, y(limits.lower)-4)}" text-anchor="end" class="metric-graph__limit-label">LOW ${escapeHTML(limits.lower)}</text>` : '';
  const upperLine = limits.upper !== null ? `<line x1="${left}" x2="${width-right}" y1="${y(limits.upper)}" y2="${y(limits.upper)}" class="metric-graph__limit metric-graph__limit--upper"/><text x="${width-right}" y="${Math.max(8, y(limits.upper)-4)}" text-anchor="end" class="metric-graph__limit-label">HIGH ${escapeHTML(limits.upper)}</text>` : '';
  const current = points.at(-1);
  const columns = metric.chartType === 'column'
    ? points.map((point, index) => {
        const gap = 8;
        const slot = (width - left - right) / points.length;
        const barWidth = Math.max(5, Math.min(30, slot - gap));
        const barX = left + index * slot + (slot - barWidth) / 2;
        const barY = y(point.value);
        return `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, height-bottom-barY).toFixed(1)}" rx="1" class="metric-graph__bar"/>`;
      }).join('')
    : `<polygon points="${area}" class="metric-graph__area"/><path d="${linePath}" class="metric-graph__line" fill="none" stroke="#B6FF3B" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${current.x}" cy="${current.y}" r="4" class="metric-graph__point"/>`;
  return `<svg
    class="metric-graph metric-graph--${metric.chartType === 'column' ? 'column' : 'line'}"
    style="--metric-accent: var(--${escapeHTML(metric.color || 'blue')})"
    viewBox="0 0 ${width} ${height}"
    preserveAspectRatio="none"
    role="img" aria-label="${escapeHTML(metric.name)} ${metric.chartType === 'column' ? 'daily averages' : 'trend'} with configured upper and lower limits">
    ${[.25,.5,.75].map(frac => `<line x1="${left}" x2="${width-right}" y1="${top + frac*(height-top-bottom)}" y2="${top + frac*(height-top-bottom)}" class="metric-graph__grid"/>`).join('')}
    ${columns}${lowerLine}${upperLine}
  </svg>`;
}
export function metricCard(metric) {
  const status = evaluateMetric(metric);
  const statusLabel = status.severity === 'critical' ? 'Critical' : status.severity === 'warning' ? 'Review' : 'In range';
  const value = formatMetricValue(metric);
  const limits = getLimits(metric);
  const unit = metric.unit || '';
  const limitCaption = metric.kind === 'mood'
    ? 'Mood scale · Low to great'
    : metric.kind === 'blood-pressure'
      ? 'SYS LOW 90 / HIGH 140 · DIA LOW 60 / HIGH 90 mmHg'
      : `${limits.lower !== null ? `LOW ${limits.lower}` : 'LOW —'}  ·  ${limits.upper !== null ? `HIGH ${limits.upper}` : 'HIGH —'}${unit ? ` ${unit}` : ''}`;
  return `
    <article class="metric-card metric-card--${status.severity}" style="--metric-accent: var(--${escapeHTML(metric.color || 'blue')})" data-action="view-metric" data-id="${escapeHTML(metric.id)}" data-metric-id="${escapeHTML(metric.id)}" draggable="true" role="button" tabindex="0" aria-label="View details for ${escapeHTML(metric.name)}">
      <div class="metric-card__identity">
        <span class="metric-drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
        <span class="metric-icon">${icon(metric.icon || 'activity', 18)}</span>
        <div class="metric-card__identity-copy"><div class="metric-card__label">${escapeHTML(metric.name)}</div><span>${escapeHTML(metric.category || '')}</span></div>
        <div class="metric-card__value"><span class="metric-card__value-main">${escapeHTML(value)}<span class="metric-card__unit">${escapeHTML(unit)}</span></span>${metric.id === 'temperature' ? '<small class="metric-current-label">CURRENT</small>' : ''}</div>
        <span class="metric-status metric-status--${status.severity}"><span class="status-dot"></span>${statusLabel}</span>
      </div>
      <div class="metric-card__chart-wrap">${metric.id === 'temperature' ? '<div class="metric-chart-caption">DAILY AVERAGE</div>' : ''}${metricGraph(metric)}<div class="metric-card__limits">${escapeHTML(limitCaption)}</div></div>
      <div class="metric-card__bottom"><span>${escapeHTML(metric.subtitle || metric.category || '')}</span><span class="metric-updated">${escapeHTML(metric.updated || 'Just now')}</span></div>
      ${status.severity !== 'normal' ? `<div class="metric-alert-note">${icon('warning', 13)} ${escapeHTML(status.label)}</div>` : ''}
    </article>`;
}
