// Turns dropped / picked files (or whole folders) into plain records the converters can read.
const EXT = {
  data: ['csv', 'tsv', 'json', 'xlsx', 'xls'],
  doc: ['txt', 'md', 'pdf', 'doc', 'docx'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
};
export const extOf = (name) => (String(name).split('.').pop() || '').toLowerCase();
export const kindOf = (name) => Object.keys(EXT).find((k) => EXT[k].includes(extOf(name))) || 'other';
const MAX_BYTES = 8e6;

async function walk(entry, base = '') {
  if (entry.isFile) return [{ file: await new Promise((res, rej) => entry.file(res, rej)), path: base + entry.name }];
  const reader = entry.createReader(), all = [];
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    all.push(...batch);
  }
  return (await Promise.all(all.map((e) => walk(e, `${base}${entry.name}/`)))).flat();
}

/** Call synchronously inside the `drop` event: the browser only lets you read the folder entries there. */
export async function collectDropped(dataTransfer) {
  const entries = [...dataTransfer.items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...dataTransfer.files].map((file) => ({ file, path: file.name }));
  return (await Promise.all(entries.map((e) => walk(e)))).flat();
}
export const collectPicked = (fileList) => [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));

/** { file, path } -> { name, path, dir, size, ext, kind, text } (text only for csv/tsv/json) */
export async function readItem({ file, path }) {
  const ext = extOf(file.name), slash = path.lastIndexOf('/');
  const rec = { name: file.name, path, dir: slash > 0 ? path.slice(0, slash) : '', size: file.size, ext, kind: kindOf(file.name), text: null };
  if (['csv', 'tsv', 'json'].includes(ext)) {
    if (file.size > MAX_BYTES) rec.error = 'File is larger than 8 MB.';
    else rec.text = await file.text();
  }
  return rec;
}
