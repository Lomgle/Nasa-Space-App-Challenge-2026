// The "File directory" page: drop files/folders anywhere -> preview what they convert to -> Apply to the website.
import { escapeHTML as esc, icon } from '../src/lib/ui.js';
import { STORAGE_KEY } from '../src/lib/health.js';
import { collectDropped, collectPicked, importFiles, mergeData, emptyData, loadOverlay, saveOverlay, clearOverlay } from './index.js';

const KIND_ICON = { data: 'database', doc: 'file', image: 'file', other: 'file' };
const STATUS = { converted: ['ok', 'Converted'], empty: ['warn', 'No readings found'], unsupported: ['idle', 'Not convertible yet'], stored: ['idle', 'Listed only'], error: ['bad', 'Error'] };
const fmtSize = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const fmtValue = (v) => (v && typeof v === 'object' ? `${v.systolic}/${v.diastolic}` : String(v));

export class FileDirectoryController {
  /** @param o { active, base, notes, rerender(), toast(msg), openPage() }
   *  active = data shown on the site now, base = data/*.json + real_data/ (before saved imports) */
  constructor(o) {
    Object.assign(this, o);
    this.batch = null; this.busy = false; this.depth = 0; this.observer = null;
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = new URL('./directory.css', import.meta.url).href;
    document.head.append(css);
  }

  // ----- drag & drop anywhere on the site -----
  attachWindow() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'fd-overlay';
    this.overlay.innerHTML = `<div>${icon('upload', 34)}<b>Drop to import</b><span>Files or folders · CSV, TSV and JSON are converted to your dashboard data</span></div>`;
    document.body.append(this.overlay);
    const isFiles = (e) => e.dataTransfer?.types?.includes('Files');
    for (const type of ['dragenter', 'dragover', 'dragleave']) window.addEventListener(type, (e) => {
      if (!isFiles(e)) return;
      e.preventDefault();
      if (type === 'dragenter') this.depth++;
      if (type === 'dragleave') this.depth = Math.max(0, this.depth - 1);
      document.body.classList.toggle('fd-dragging', this.depth > 0);
    });
    window.addEventListener('drop', (e) => {
      if (!isFiles(e)) return;
      e.preventDefault(); this.depth = 0; document.body.classList.remove('fd-dragging');
      this.ingest(collectDropped(e.dataTransfer)); // must start inside the drop event
    });
  }

  async ingest(pending) {
    const items = (await pending).filter(({ file }) => !file.name.startsWith('.'));
    if (!items.length) return this.toast('No files found.');
    this.openPage(); this.busy = true; this.rerender();
    try {
      this.batch = await importFiles(items, this.active);
    } catch (e) { console.error(e); this.toast(`Import failed: ${e.message}`); this.batch = null; }
    this.busy = false; this.rerender();
    const n = this.batch ? this.batch.files.reduce((s, f) => s + (f.report.readings || 0), 0) : 0;
    this.toast(n ? `Read ${items.length} file(s): ${n} reading(s) ready. Review them, then press Apply.` : `Read ${items.length} file(s): no readings found.`);
  }

  // ----- events (return true when handled) -----
  click(action) {
    if (action === 'fd-apply') this.apply();
    else if (action === 'fd-discard') { this.batch = null; this.rerender(); }
    else if (action === 'fd-clear') this.clearImported();
    else return false;
    return true;
  }
  change(event) {
    if (event.target.id !== 'fd-files' && event.target.id !== 'fd-folder') return false;
    const picked = collectPicked(event.target.files);
    event.target.value = '';
    this.ingest(Promise.resolve(picked));
    return true;
  }

  resetDashboardState() { // metric cards, crew snapshots and the log are rebuilt from the data files; chats and preferences stay
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const s = JSON.parse(raw); delete s.metrics; delete s.crewSnapshots; delete s.log; localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
    } catch { /* nothing saved yet */ }
    sessionStorage.setItem('orbit-health-open-view', 'files');
    location.reload();
  }
  apply() {
    if (!this.batch) return;
    if (!window.confirm('Apply the converted data to the website? Metric cards, crew snapshots and the activity log are rebuilt from the data files. Chats and preferences are kept.')) return;
    try {
      const overlay = mergeData(loadOverlay() ?? emptyData(), this.batch.staged, { partial: true }).data;
      mergeData(this.base, overlay, { validate: true }); // throws a readable list if anything is invalid
      if (!saveOverlay(overlay)) throw new Error('Browser storage is full.');
      this.resetDashboardState();
    } catch (e) { console.error(e); this.toast(`Could not apply: ${String(e.message).split('\n').slice(0, 2).join(' ')}`); }
  }
  clearImported() {
    if (!window.confirm('Remove everything imported with the File directory? The data files and real_data/ are not touched.')) return;
    clearOverlay(); this.resetDashboardState();
  }

  // ----- scroll reveal -----
  afterRender(root) {
    this.observer?.disconnect();
    const items = root.querySelectorAll('.fd-page [data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-visible')); return; }
    this.observer = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); this.observer.unobserve(en.target); }
    }), { threshold: 0.1 });
    items.forEach((el) => this.observer.observe(el));
  }

  // ----- markup -----
  page(date) {
    const b = this.batch;
    const total = b ? b.files.reduce((s, f) => s + (f.report.readings || 0), 0) : 0;
    return `<div class="fd-page">
      <section class="page-header"><div><div class="eyebrow">MISSION DATA · FILE DIRECTORY</div><h1>File directory</h1>
        <p class="page-subtitle">Drop any file or folder anywhere on the site. CSV, TSV and JSON are converted to the format of <code>astronauts.json</code>, <code>metrics.json</code> and <code>health.json</code>, so the readings can appear on the dashboard.</p></div>
        <div class="header-date"><span>${icon('database', 15)}</span><div><b>${esc(date)}</b><small>${b ? `${b.files.length} file(s) staged` : 'Nothing staged'}</small></div></div></section>
      <section class="panel fd-drop" data-reveal>
        <div class="fd-drop-icon">${icon('upload', 22)}</div>
        <div class="fd-drop-copy"><h2>Drag &amp; drop files or a folder</h2><p>Every file is read in your browser. Nothing is applied until you press <b>Apply to dashboard</b>.</p></div>
        <div class="fd-drop-actions">
          <label class="button button--primary" for="fd-files">${icon('file', 14)} Choose files</label>
          <label class="button button--quiet" for="fd-folder">${icon('database', 14)} Choose folder</label>
        </div>
        <input id="fd-files" type="file" multiple hidden /><input id="fd-folder" type="file" webkitdirectory hidden />
      </section>
      ${this.busy ? `<section class="panel fd-busy" data-reveal>Reading and converting files…</section>` : ''}
      ${b ? this.batchHTML(b, total) : ''}
      ${this.activeHTML()}
      <p class="fd-note">${icon('shield', 14)} Files never leave your browser. Imported data is stored in this browser only and can be removed at any time.</p>
    </div>`;
  }

  batchHTML(b, total) {
    const groups = new Map();
    b.files.forEach((f) => (groups.get(f.dir) ?? groups.set(f.dir, []).get(f.dir)).push(f));
    const rows = [...groups].sort(([a], [c]) => a.localeCompare(c)).map(([dir, list]) => `
      <div class="fd-group-title">${icon('database', 13)} ${esc(dir || 'Dropped files')}</div>
      ${list.map((f, i) => {
        const [tone, label] = STATUS[f.status] || STATUS.stored, r = f.report;
        const lines = [r.format && `${esc(r.format)}${r.readings ? ` · ${r.readings} reading(s)` : ''}`, r.error && `<b class="fd-bad">${esc(r.error)}</b>`, f.error && `<b class="fd-bad">${esc(f.error)}</b>`, ...(r.warnings || []).slice(0, 2).map(esc)].filter(Boolean);
        return `<article class="fd-row panel" data-reveal style="--i:${Math.min(i, 8)}"><div class="fd-file-icon fd-file-icon--${f.kind}">${icon(KIND_ICON[f.kind] || 'file', 16)}</div>
          <div class="fd-file-main"><b>${esc(f.name)}</b><span>${lines.join(' · ') || esc(f.path)}</span></div>
          <span class="fd-size">${fmtSize(f.size)}</span><span class="fd-chip fd-chip--${tone}">${label}</span></article>`;
      }).join('')}`).join('');

    const defs = new Map([...this.active.metrics.metrics, ...b.staged.metrics.metrics].map((d) => [d.id, d]));
    const names = new Map([...this.active.astronauts, ...b.staged.astronauts].map((a) => [a.id, a]));
    const known = new Set(this.active.astronauts.map((a) => a.id));
    const preview = Object.entries(b.staged.health).flatMap(([id, h]) => Object.entries(h.readings).map(([mid, series]) => {
      const last = series.at(-1), def = defs.get(mid);
      return `<tr><td>${esc(names.get(id)?.name || id)} <i class="fd-chip fd-chip--${known.has(id) ? 'idle' : 'ok'}">${known.has(id) ? 'existing' : 'new'}</i></td>
        <td>${esc(def?.name || mid)}</td><td><b>${esc(fmtValue(last.value))}</b> ${esc(def?.unit || '')}</td><td>${esc(last.date)}</td><td>${series.length}</td></tr>`;
    })).slice(0, 60);

    return `<section class="fd-batch">
      <div class="fd-summary panel" data-reveal><div><div class="eyebrow">PREVIEW</div><h2>${total} reading(s) ready to appear on the website</h2>
        <p>${b.staged.astronauts.length} new crew entr${b.staged.astronauts.length === 1 ? 'y' : 'ies'} · ${b.staged.metrics.metrics.length} new metric${b.staged.metrics.metrics.length === 1 ? '' : 's'} · ${Object.keys(b.staged.health).length} astronaut(s) updated</p></div>
        <div class="fd-actions"><button type="button" class="button button--primary" data-action="fd-apply" ${total ? '' : 'disabled'}>Apply to dashboard</button>
        <button type="button" class="button button--quiet" data-action="fd-discard">Discard</button></div></div>
      ${rows}
      ${preview.length ? `<div class="panel fd-preview" data-reveal><div class="eyebrow">WHAT WILL BE ADDED (latest value per metric)</div>
        <div class="fd-table-wrap"><table class="fd-table"><thead><tr><th>Astronaut</th><th>Metric</th><th>Latest</th><th>Date</th><th>Points</th></tr></thead><tbody>${preview.join('')}</tbody></table></div></div>` : ''}
    </section>`;
  }

  activeHTML() {
    const rows = this.notes.map((n) => {
      const detail = n.skipped ? `<b class="fd-bad">Skipped: ${esc((n.problems || ['invalid data'])[0])}</b>` : `${n.astronauts} crew · ${n.metrics} metrics · ${n.readings} readings`;
      const label = n.source === 'data' ? 'data/' : n.source === 'real_data' ? 'real_data/' : 'browser';
      return `<article class="fd-row panel" data-reveal><div class="fd-file-icon fd-file-icon--data">${icon('database', 16)}</div>
        <div class="fd-file-main"><b>${esc(n.title)}</b><span>${detail}</span></div><span class="fd-size">${label}</span>
        ${n.source === 'imported' ? `<button type="button" class="button button--quiet" data-action="fd-clear">Remove imported</button>` : `<span class="fd-chip fd-chip--${n.skipped ? 'bad' : 'ok'}">${n.skipped ? 'Skipped' : 'Active'}</span>`}</article>`;
    }).join('');
    return `<section class="fd-active"><div class="fd-group-title">${icon('database', 13)} Data currently on the website</div>${rows}</section>`;
  }
}
