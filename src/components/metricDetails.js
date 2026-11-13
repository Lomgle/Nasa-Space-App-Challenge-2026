import { escapeHTML, icon } from '../lib/ui.js';
import { metricGraph } from './metricCard.js';
import { evaluateMetric, formatMetricValue } from '../lib/health.js';

export function metricDetailsDialog(metric) {
  const status = evaluateMetric(metric);
  const statusLabel = status.severity === 'critical' ? 'Critical' : status.severity === 'warning' ? 'Review' : 'In range';
  const trend = (metric.trend || []).slice(-8);
  const history = trend.length ? trend.map((value, index) => `<div class="metric-history-point"><span>${index + 1}</span><b>${escapeHTML(value)}</b></div>`).join('') : '<p class="metric-detail-muted">No recent trend samples are available.</p>';
  const thresholds = metric.thresholds?.length
    ? metric.thresholds.map(rule => `<div class="metric-detail-rule"><span>${escapeHTML(rule.label)}</span><b>${escapeHTML(rule.operator)} ${escapeHTML(Array.isArray(rule.value) ? rule.value.join(', ') : rule.value)}</b></div>`).join('')
    : '<p class="metric-detail-muted">No example alert threshold is configured for this metric.</p>';

  return `
    <div class="modal-backdrop metric-details-backdrop" data-action="backdrop-close">
      <section class="modal metric-details-modal" role="dialog" aria-modal="true" aria-labelledby="metric-details-title">
        <div class="modal-heading">
          <div><div class="eyebrow">HEALTH METRIC / DETAIL VIEW</div><h2 id="metric-details-title">${escapeHTML(metric.name)}</h2></div>
          <button class="icon-button modal-close-button" data-action="close-modal" aria-label="Close">${icon('close', 17)}</button>
        </div>
        <div class="metric-detail-hero metric-detail-hero--${status.severity}">
          <div><span>Latest reading</span><strong>${escapeHTML(formatMetricValue(metric))}<small>${escapeHTML(metric.unit || '')}</small></strong></div>
          <span class="metric-status metric-status--${status.severity}"><span class="status-dot"></span>${statusLabel}</span>
        </div>
        <section class="metric-detail-section"><div class="metric-detail-section-heading"><b>Recent trend</b><span>${trend.length} local sample${trend.length === 1 ? '' : 's'} · configured limits</span></div><div class="metric-detail-chart metric-detail-chart--full">${metric.id === 'temperature' ? '<div class="metric-chart-caption">DAILY AVERAGE · LATEST TEMPERATURE ABOVE</div>' : ''}${metricGraph(metric)}</div><div class="metric-history-strip">${history}</div></section>
        <section class="metric-detail-section"><div class="metric-detail-section-heading"><b>Threshold rules</b><span>Demo configuration</span></div>${thresholds}</section>
        <div class="metric-detail-meta"><span>Last updated</span><b>${escapeHTML(metric.updated || 'Just now')}</b></div>
        <div class="modal-actions"><span class="modal-note">Values are stored locally on this device.</span><button type="button" class="button button--primary" data-action="edit" data-id="${escapeHTML(metric.id)}">Edit metric</button></div>
      </section>
    </div>`;
}
