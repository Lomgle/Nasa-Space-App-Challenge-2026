import { escapeHTML, icon } from '../lib/ui.js';
import { METRIC_CATEGORIES } from '../data/metricRegistry.js';

export function metricDialog(metric = null) {
  const isNew = !metric;
  const moodOptions = ['Great', 'Steady', 'Low', 'Strained'];
  const numberControl = ({ name, value = '', placeholder = 'Enter a value', step = 'auto', min = null, disabled = false, required = true }) => {
    const resolvedStep = step === 'auto' ? (value !== '' && !Number.isInteger(Number(value)) ? '0.1' : '1') : step;
    return `
    <div class="number-control">
      <input name="${name}" type="number" ${min !== null ? `min="${min}"` : ''} step="${resolvedStep}" ${disabled ? 'disabled' : ''} ${required ? 'required' : ''} ${value !== '' ? `value="${escapeHTML(value)}"` : `placeholder="${escapeHTML(placeholder)}"`} />
      <div class="number-stepper" aria-label="Adjust ${name}">
        <button type="button" data-action="step-number" data-step="-1" aria-label="Decrease ${name}" ${disabled ? 'disabled' : ''}>−</button>
        <button type="button" data-action="step-number" data-step="1" aria-label="Increase ${name}" ${disabled ? 'disabled' : ''}>+</button>
      </div>
    </div>`;
  };
  const valueFields = metric?.kind === 'blood-pressure'
    ? `<div class="form-grid"><label class="field"><span>Systolic</span>${numberControl({ name: 'systolic', value: metric.value.systolic, min: 0, step: 1 })}</label><label class="field"><span>Diastolic</span>${numberControl({ name: 'diastolic', value: metric.value.diastolic, min: 0, step: 1 })}</label></div>`
    : metric?.kind === 'mood'
      ? `<label class="field"><span>Current check-in</span><select name="value">${moodOptions.map(v => `<option ${metric.value === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`
      : `<label class="field"><span>${isNew ? 'Current reading' : 'New reading'}${!isNew && metric?.unit ? ` (${escapeHTML(metric.unit)})` : ''}</span>${numberControl({ name: 'value', value: isNew ? '' : metric.value })}</label>`;
  const thresholdInfo = metric?.thresholds?.length
    ? `<div class="threshold-summary"><span class="threshold-summary__icon">${icon('shield', 16)}</span><div><b>Configured demo thresholds</b><p>${metric.thresholds.map(t => `${escapeHTML(t.label)} (${escapeHTML(t.operator)} ${escapeHTML(Array.isArray(t.value) ? t.value.join(', ') : t.value)})`).join(' · ')}</p><small>Replace these examples with mission-approved protocols before operational use.</small></div></div>`
    : '';
  const addFields = `
    <label class="field"><span>Metric name</span><input name="name" required maxlength="32" placeholder="e.g. Hydration" /></label>
    <div class="form-grid"><label class="field"><span>Unit</span><input name="unit" maxlength="12" placeholder="e.g. L, kg, bpm" /></label><label class="field"><span>Category</span><select name="category">${METRIC_CATEGORIES.map(c => `<option>${escapeHTML(c)}</option>`).join('')}</select></label></div>
    <label class="field"><span>Current value</span>${numberControl({ name: 'value', step: 'any' })}</label>
    <label class="field"><span>Chart display</span><select name="chartType"><option value="line" selected>Line chart</option><option value="column">Column chart</option></select></label>
    <div class="form-grid"><label class="field"><span>Lower limit <small>(optional)</small></span>${numberControl({ name: 'lowerLimit', step: 'any', placeholder: 'No lower limit', required: false })}</label><label class="field"><span>Upper limit <small>(optional)</small></span>${numberControl({ name: 'upperLimit', step: 'any', placeholder: 'No upper limit', required: false })}</label></div>
    <p class="field-hint">Limits are local demo settings. They are visual and alert rules only, not medical guidance.</p>`;
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="metric-dialog-title">
        <div class="modal-heading"><div><div class="eyebrow">${isNew ? 'EXPAND THE DASHBOARD' : escapeHTML(metric.category || 'METRIC RECORD')}</div><h2 id="metric-dialog-title">${isNew ? 'Add a metric' : `Update ${escapeHTML(metric.name)}`}</h2></div><button class="icon-button modal-close-button" data-action="close-modal" aria-label="Close">${icon('close', 17)}</button></div>
        <form id="metric-form" data-mode="${isNew ? 'add' : 'edit'}" data-id="${isNew ? '' : escapeHTML(metric.id)}">
          ${isNew ? addFields : valueFields}
          ${thresholdInfo}
          <div class="modal-actions">
            ${!isNew && metric.isCustom ? `<button type="button" class="button button--danger-quiet" data-action="delete-metric" data-id="${escapeHTML(metric.id)}">Remove metric</button>` : '<span class="modal-note">Local changes stay on this device.</span>'}
            <button type="button" class="button button--quiet" data-action="close-modal">Cancel</button>
            <button type="submit" class="button button--primary">${isNew ? 'Add metric' : 'Save'}</button>
          </div>
        </form>
      </section>
    </div>`;
}
