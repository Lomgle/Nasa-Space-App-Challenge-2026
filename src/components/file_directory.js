import { escapeHTML as esc, icon } from '../lib/ui.js';

const KIND = { data: ['table', 'Datasets'], doc: ['file', 'Documents'], image: ['image', 'Images'], other: ['file', 'Other'] };
const fmt = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const inFolder = (f, folder) => !folder || f.dir === folder || f.dir.startsWith(`${folder}/`);

function status(f) {
  const n = f.created + f.updated;
  if (n) return ['ok', `${n} reading${n === 1 ? '' : 's'} on dashboard`];
  if (f.entries.length) return ['ready', 'Ready to import'];
  return ['idle', f.kind === 'data' ? 'No readings found' : 'Stored in directory'];
}

function row(f, i) {
  const [tone, label] = status(f), n = f.created + f.updated;
  return `<article class="file-row panel" data-reveal style="--i:${i}">
    <div class="file-icon file-icon--${f.kind}">${icon(KIND[f.kind][0], 18)}</div>
    <div class="file-main"><b>${esc(f.name)}</b><span>${esc(f.path)}</span></div>
    <span class="file-size">${fmt(f.size)}</span>
    <span class="file-status file-status--${tone}">${label}</span>
    <div class="file-actions">
      ${f.entries.length ? `<button type="button" class="button button--quiet" data-action="file-import" data-id="${esc(f.id)}">${n ? 'Re-import' : 'Import'}</button>` : ''}
      <button type="button" class="file-remove" data-action="file-remove" data-id="${esc(f.id)}" aria-label="Remove ${esc(f.name)} from directory">${icon('trash', 15)}</button>
    </div>
  </article>`;
}

export function filesPage({ files, folder, kind, auto, date }) {
  const dirs = new Set();
  files.forEach(f => { const p = f.dir ? f.dir.split('/') : []; p.forEach((_, i) => dirs.add(p.slice(0, i + 1).join('/'))); });
  const tree = [...dirs].sort().map(d => {
    const depth = d.split('/').length - 1;
    return `<button type="button" class="tree-item ${folder === d ? 'is-active' : ''}" data-action="files-folder" data-folder="${esc(d)}" style="padding-left:${10 + depth * 14}px">${icon('folder', 14)}<span>${esc(d.split('/').pop())}</span><em>${files.filter(f => inFolder(f, d)).length}</em></button>`;
  }).join('');
  const shown = files.filter(f => inFolder(f, folder) && (kind === 'all' || f.kind === kind));
  const imported = files.reduce((s, f) => s + f.created + f.updated, 0);
  const chips = ['all', ...Object.keys(KIND)].map(k => `<button type="button" class="files-chip ${kind === k ? 'is-active' : ''}" data-action="files-kind" data-kind="${k}">${k === 'all' ? 'All' : KIND[k][1]}</button>`).join('');

  return `
    <section class="page-header"><div><div class="eyebrow">MISSION CONSOLE <span>·</span> DATA INTAKE</div><h1>File directory</h1><p class="page-subtitle">Drop files or whole folders anywhere in the app. Readings found in CSV and JSON files appear on the dashboard automatically.</p></div><div class="header-date"><span>${icon('clock', 15)}</span><div><b>${date}</b><small>${files.length} file${files.length === 1 ? '' : 's'} in directory</small></div></div></section>
    <section class="files-drop panel" data-reveal>
      <div class="files-drop__icon">${icon('upload', 22)}</div>
      <div><h2>Drag & drop files or a folder anywhere</h2><p>CSV and JSON readings become dashboard metrics. Other files are kept in the directory.</p></div>
      <div class="files-drop__actions">
        <label class="button button--primary" for="file-import">${icon('file', 14)} Choose files</label>
        <label class="button button--quiet" for="folder-import">${icon('folder', 14)} Choose folder</label>
        <label class="files-auto"><input type="checkbox" id="file-auto" ${auto ? 'checked' : ''}/> Auto-import to dashboard</label>
      </div>
      <input id="file-import" type="file" multiple hidden /><input id="folder-import" type="file" webkitdirectory hidden />
    </section>
    <section class="files-stats" data-reveal>
      <div><b>${files.length}</b><span>FILES</span></div><div><b>${dirs.size}</b><span>FOLDERS</span></div><div><b>${imported}</b><span>READINGS IMPORTED</span></div>
    </section>
    <section class="files-layout">
      <aside class="files-tree panel" data-reveal>
        <div class="eyebrow">DIRECTORY</div>
        <button type="button" class="tree-item ${folder === '' ? 'is-active' : ''}" data-action="files-folder" data-folder="">${icon('folder', 14)}<span>All files</span><em>${files.length}</em></button>${tree}
      </aside>
      <div class="files-list">
        <div class="files-chips">${chips}</div>
        ${shown.length ? shown.map(row).join('') : `<div class="panel files-empty" data-reveal>${icon('upload', 22)}<h3>${files.length ? 'Nothing in this view' : 'No files yet'}</h3><p>${files.length ? 'Try another folder or file type.' : 'Drop a CSV or JSON file anywhere to see it land on the dashboard.'}</p></div>`}
      </div>
    </section>
    <div class="local-storage-note">${icon('shield', 16)} <span>Files are read in your browser only. Their metadata and extracted readings are stored locally; the original file contents are not kept.</span></div>`;
}