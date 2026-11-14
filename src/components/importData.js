import { escapeHTML, icon } from "../lib/ui.js";

const PAGE_SIZE = 50;

export function importDataPage({ dataset, page = 0, status = "" }) {
  const totalRows = dataset?.rows?.length || 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(Math.max(0, page), pageCount - 1);
  const firstIndex = currentPage * PAGE_SIZE;
  const visibleRows = (dataset?.rows || []).slice(firstIndex, firstIndex + PAGE_SIZE);
  const saved = Boolean(dataset?.savedToRawData);
  const importedAt = dataset?.importedAt
    ? new Date(dataset.importedAt).toLocaleString()
    : "";

  const table = dataset
    ? `<section class="panel imported-data-panel">
        <div class="imported-data-heading">
          <div><div class="eyebrow">IMPORTED RECORDS</div><h2>CSV data preview</h2><p>${totalRows.toLocaleString()} rows · ${dataset.headers.length} columns</p></div>
          <span class="import-save-state ${saved ? "is-saved" : "is-download"}"><i></i>${saved ? "SAVED TO RAW_DATA" : "SESSION PREVIEW"}</span>
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

  return `
    <section class="page-header import-page-header">
      <div><div class="eyebrow">MISSION DATA · LOCAL INGESTION</div><h1>Import data</h1><p class="page-subtitle">Bring external CSV records into Orbit Health for local review.</p></div>
      <div class="header-date"><span>${icon("database", 15)}</span><div><b>${totalRows.toLocaleString()} records</b><small>${dataset ? `${dataset.headers.length} data columns` : "No imported dataset"}</small></div></div>
    </section>
    <section class="panel import-upload-panel">
      <div class="import-upload-copy"><div class="eyebrow">CSV INGESTION</div><h2>Upload mission data</h2><p>Select several CSV files at once. Their rows will be combined into one dataset. Matching column names are aligned, and columns found in only some files are retained.</p></div>
      <label class="import-dropzone" for="csv-upload"><span class="import-upload-icon">${icon("upload", 23)}</span><b>Choose CSV files</b><span>Multiple files supported · .csv format · up to 20 MB total</span><input id="csv-upload" type="file" accept=".csv,text/csv" multiple /></label>
      <div class="import-storage-note"><span>${icon("shield", 14)}</span><span>Imported records are kept separate from the demo health metrics. With the local app server, the merged file is saved as <code>raw_data/merged.csv</code>.</span></div>
      ${status ? `<div class="import-status" role="status" aria-live="polite">${escapeHTML(status)}</div>` : ""}
    </section>
    ${table}
    <p class="import-disclaimer">Imported CSV values are displayed as raw records. They do not automatically change health metrics, alerts, or crew profiles.</p>
  `;
}
