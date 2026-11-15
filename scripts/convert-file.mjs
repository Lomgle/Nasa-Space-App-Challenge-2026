// Usage: node scripts/convert-file.mjs <input.csv|tsv|json> [outputFolder]
// Converts any data file to the format of data/astronauts.json, data/metrics.json and data/health.json.
// The three files written contain only what the input adds; copy them into real_data/ (see real_data/SOURCES.md).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import { convertText } from '../file_directory_function/index.js';

const [input, out = 'converted'] = process.argv.slice(2);
if (!input) { console.error('Usage: node scripts/convert-file.mjs <input.csv|tsv|json> [outputFolder]'); process.exit(1); }
const read = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const known = { astronauts: read('astronauts'), metrics: read('metrics'), health: read('health') };

const { bundle, report } = convertText(basename(input), readFileSync(input, 'utf8'), known);
if (report.error) { console.error(`Could not convert: ${report.error}`); process.exit(1); }
mkdirSync(out, { recursive: true });
const write = (name, data) => writeFileSync(`${out}/${name}.json`, JSON.stringify(data, null, 2) + '\n');
write('astronauts', bundle.astronauts);
write('metrics', { categories: bundle.categories, metrics: bundle.metrics });
write('health', bundle.health);
console.log(`${report.format}: ${report.readings} readings, ${report.astronauts} new astronaut(s), ${report.metrics} new metric(s) -> ${out}/`);
for (const w of report.warnings) console.log(`! ${w}`);
