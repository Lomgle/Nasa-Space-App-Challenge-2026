import { escapeHTML, icon } from "../lib/ui.js";

const PAGE_SIZE = 50;

export function importDataPage({ dataset, page = 0, status = "", review = null }) {
  const totalRows = dataset?.rows?.length || 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(Math.max(0, page), pageCount - 1);
  const firstIndex = currentPage * PAGE_SIZE;
  const visibleRows = (dataset?.rows || []).slice(firstIndex, firstIndex + PAGE_SIZE);
  const importedAt = dataset?.importedAt
    ? new Date(dataset.importedAt).toLocaleString()
    : "";

  const table = dataset
    ? `<section class="panel imported-data-panel">
        <div class="imported-data-heading">
          <div><div class="eyebrow">IMPORTED RECORDS</div><h2>CSV data preview</h2><p>${totalRows.toLocaleString()} rows · ${dataset.headers.length} columns</p></div>
          <div class="imported-data-actions"><span class="import-save-state is-download"><i></i>SESSION PREVIEW</span><button type="button" class="button button--secondary" data-action="download-import">Download merged CSV</button></div>
        </div>
        <div class="import-meta-row">
          <span>${icon("file", 14)} ${dataset.sourceFiles.map(escapeHTML).join(" · ")}</span>
          ${importedAt ? `<span>Imported ${escapeHTML(importedAt)}</span>` : ""}
        </div>
        <div class="import-table-wrap">
          <table class="import-table">
            <thead><tr>${dataset.headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("")}</tr></thead>
            <tbody>${visibleRows.length ? visibleRows.map((row) => `<tr>${row.map((value) => `<td title="${escapeHTML(value)}">${escapeHTML(value) || '<span class="import-empty-cell">—</span>'}</td>`).join("")}</tr>`).join("") : `<tr><td class="import-no-rows" colspan="${dataset.headers.length}">The CSV has headers but no data rows.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="import-table-footer"><span>Showing ${totalRows ? (firstIndex + 1).toLocaleString() : 0}–${Math.min(firstIndex + PAGE_SIZE, totalRows).toLocaleString()} of ${totalRows.toLocaleString()} rows</span><div><button type="button" class="button button--secondary" data-action="import-page-prev" ${currentPage === 0 ? "disabled" : ""}>${icon("chevron", 13)} Previous</button><span>Page ${currentPage + 1} / ${pageCount}</span><button type="button" class="button button--secondary import-next-button" data-action="import-page-next" ${currentPage >= pageCount - 1 ? "disabled" : ""}>Next ${icon("chevron", 13)}</button></div></div>
      </section>`
    : `<section class="panel import-empty-panel"><div class="import-empty-icon">${icon("file", 24)}</div><h2>No CSV data loaded</h2><p>Upload one or more CSV files to merge their records and preview them here.</p></section>`;

  const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
  const reviewPanel = !review ? "" : review.ok
    ? `<section class="panel import-review import-review--ok" aria-live="polite">
        <div class="eyebrow">REVIEW · NOT APPLIED YET</div>
        <h2>Apply ${plural(review.summary.readings, "reading")} to crew health data?</h2>
        <p>${review.summary.added} new · ${review.summary.overwritten} overwrite existing values · ${review.summary.unchanged} already identical${review.summary.newAstronauts.length ? ` · New crew: ${review.summary.newAstronauts.map(escapeHTML).join(", ")}` : ""}</p>
        <ul class="import-review-list">${review.summary.perAstronaut.map((a) => `<li><b>${escapeHTML(a.name)}</b>${a.isNew ? " (new)" : ""}${a.isDefault ? " · charts show the last 7 days" : ""}: ${a.added} new, ${a.overwritten} overwritten, ${a.unchanged} identical</li>`).join("")}</ul>
        <p class="import-review-note">Applying changes the saved crew data in this browser. Factory reset (Debug) restores the original data.</p>
        <div class="import-review-actions"><button type="button" class="button button--primary" data-action="import-apply">Apply to dashboard</button><button type="button" class="button button--secondary" data-action="import-discard">Discard</button></div>
      </section>`
    : `<section class="panel import-review import-review--error" role="alert">
        <div class="eyebrow">IMPORT BLOCKED</div>
        <h2>${plural(review.errors.length + review.truncated, "problem")} found</h2>
        <p>Nothing was changed. Fix the CSV and upload it again.</p>
        <ul class="import-review-list">${review.errors.map((e) => `<li>${escapeHTML(e)}</li>`).join("")}${review.truncated ? `<li>…and ${review.truncated} more.</li>` : ""}</ul>
        <div class="import-review-actions"><button type="button" class="button button--secondary" data-action="import-discard">Dismiss</button></div>
      </section>`;

  return `
    <section class="page-header import-page-header">
      <div><div class="eyebrow">MISSION DATA · LOCAL INGESTION</div><h1>Import data</h1><p class="page-subtitle">Load crew health readings from CSV, review them, then apply them to the dashboard.</p></div>
      <div class="header-date"><span>${icon("database", 15)}</span><div><b>${totalRows.toLocaleString()} records</b><small>${dataset ? `${dataset.headers.length} data columns` : "No imported dataset"}</small></div></div>
    </section>
    <section class="panel import-upload-panel">
      <div class="import-upload-copy"><div class="eyebrow">CSV INGESTION</div><h2>Upload mission data</h2><p>Select one or more CSV files, one reading per row. Columns: <code>astronaut_id, astronaut_name, role, date, metric, value, systolic, diastolic</code>. Blood pressure uses systolic/diastolic; mood uses Great, Steady, Low or Strained. Rows for an existing astronaut, metric and date overwrite the old value.</p><button type="button" class="button button--secondary" data-action="download-template">Download template CSV</button></div>
      <label class="import-dropzone" for="csv-upload"><span class="import-upload-icon">${icon("upload", 23)}</span><b>Choose CSV files</b><span>Multiple files supported · .csv format · up to 20 MB total</span><input id="csv-upload" type="file" accept=".csv,text/csv" multiple /></label>
      ${status ? `<div class="import-status" role="status" aria-live="polite">${escapeHTML(status)}</div>` : ""}
    </section>
    ${reviewPanel}
    ${table}
    <p class="import-disclaimer">Nothing from a CSV changes the dashboard until you press Apply. The whole file is rejected if any row is invalid.</p>
  `;
}
