import { escapeHTML } from '../lib/ui.js';

export function trendChart(metrics) {
  const chosen = metrics.find(m => m.id === 'heart-rate') || metrics.find(m => m.kind === 'number');
  if (!chosen) return '<div class="empty-state">Add a metric to see a trend preview.</div>';
  const values = chosen.trend || [];
  const width = 520, height = 150, left = 9, right = 10, top = 15, bottom = 24;
  const min = Math.min(...values) - 4, max = Math.max(...values) + 4, range = Math.max(1, max - min);
  const coords = values.map((v, i) => ({
    x: left + (i * (width - left - right)) / Math.max(1, values.length - 1),
    y: top + ((max - v) / range) * (height - top - bottom)
  }));
  const line = coords.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${coords[0].x},${height - bottom} ${line} ${coords.at(-1).x},${height - bottom}`;
  return `
    <div class="trend-chart-wrap">
      <div class="trend-chart-summary"><div><span class="trend-current">${escapeHTML(String(chosen.value))} <small>${escapeHTML(chosen.unit || '')}</small></span><span class="trend-subtitle">${escapeHTML(chosen.name)} · recent readings</span></div><span class="trend-period">7 readings</span></div>
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Recent ${escapeHTML(chosen.name)} readings trend">
        ${[0, 1, 2].map(i => `<line x1="${left}" x2="${width - right}" y1="${top + i * ((height - top - bottom) / 2)}" y2="${top + i * ((height - top - bottom) / 2)}" class="chart-gridline"/>`).join('')}
        <polygon points="${area}" class="chart-area"/><polyline points="${line}" class="chart-line"/>
        ${coords.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${i === coords.length - 1 ? 4 : 2.5}" class="chart-point ${i === coords.length - 1 ? 'chart-point--active' : ''}"/>`).join('')}
        <text x="${left}" y="${height - 4}" class="chart-axis-label">Earlier</text><text x="${width - right}" y="${height - 4}" text-anchor="end" class="chart-axis-label">Latest</text>
      </svg>
    </div>`;
}
