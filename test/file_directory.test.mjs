import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { convertText, mergeData, bundleToData, emptyData, importFiles } from '../file_directory_function/index.js';
import { validateData } from '../src/data/validate.js';

const rd = (dir, n) => JSON.parse(readFileSync(new URL(`../${dir}/${n}.json`, import.meta.url), 'utf8'));
const core = () => ({ astronauts: rd('data', 'astronauts'), metrics: rd('data', 'metrics'), health: rd('data', 'health') });
const real = () => ({ astronauts: rd('real_data', 'astronauts'), metrics: rd('real_data', 'metrics'), health: rd('real_data', 'health') });
const apply = (name, text, base = core()) => { const { bundle, report } = convertText(name, text, base); return { ...mergeData(base, bundleToData(bundle), { validate: true }), report }; };

test('real_data uses the exact keys of the three data files and validates when merged', () => {
  const { data, report } = mergeData(core(), real(), { validate: true });
  assert.equal(report.astronauts, 5);
  assert.deepEqual(validateData(data), []);
  assert.deepEqual(data.health['elena-voss'], core().health['elena-voss']); // existing crew untouched
  assert.equal(data.health['barger-2014-iss-sleep'].readings.sleep[0].value, 6.09);
  assert.equal(data.astronauts.filter((a) => a.default).length, 1);
});

test('long CSV: aliases, crew names and blood pressure map to existing ids', () => {
  const { data } = apply('vitals.csv', 'astronaut,metric,date,value\nJun Park,HR,2026-11-16,71\nJun,Pulse,2026-11-17,73\nElena,BP,2026-11-16,121/79\nElena,Sleep,2026-11-16,7.2\n');
  assert.deepEqual(data.health['jun-park'].readings['heart-rate'].slice(-2).map((r) => r.value), [71, 73]);
  assert.deepEqual(data.health['elena-voss'].readings['blood-pressure'].at(-1), { date: '2026-11-16', value: { systolic: 121, diastolic: 79 } });
  assert.equal(data.astronauts.length, core().astronauts.length); // nobody new was invented
});

test('wide CSV: systolic/diastolic columns, units in headers, day-first dates', () => {
  const { data, report } = apply('week.csv', 'Astronaut,Date,Systolic,Diastolic,Heart rate (bpm),Notes\nAmara Okafor,16/11/2026,118,76,66,fine\nAmara Okafor,17/11/2026,119,77,68,ok\n');
  const r = data.health['amara-okafor'].readings;
  assert.deepEqual(r['blood-pressure'].slice(-2).map((x) => x.date), ['2026-11-16', '2026-11-17']);
  assert.equal(r['heart-rate'].at(-1).value, 68);
  assert.equal(report.metrics, 0); // "Notes" is text, so it is not turned into a metric
});

test('unknown metric and new astronaut are created in the data-file format; bad values are skipped', () => {
  const { data, report } = apply('study.csv', 'subject,measurement,date,value,unit\nStudy cohort A,Grip strength,2026-11-16,41.5,kg\nStudy cohort A,Grip strength,2026-11-17,n/a,kg\n');
  assert.equal(report.skipped, 1);
  const def = data.metrics.metrics.find((m) => m.id === 'grip-strength');
  assert.deepEqual([def.kind, def.unit, def.category, def.thresholds], ['number', 'kg', 'Other', []]);
  const a = data.astronauts.find((x) => x.id === 'study-cohort-a');
  assert.ok(a && !a.default && data.health['study-cohort-a'].link.connectivity === 'offline');
});

test('rows without a date get consecutive days ending today (and a warning)', () => {
  const { report } = convertText('x.csv', 'metric,value\nheart rate,70\nheart rate,72\nheart rate,74\n', core());
  assert.match(report.warnings[0], /no date/);
});

test('JSON: native bundle, plain key/value, and records all convert', () => {
  assert.equal(convertText('b.json', JSON.stringify(real()), core()).report.format, 'Orbit Health bundle');
  const kv = convertText('kv.json', '{"heart rate": 70, "mood": "Great"}', core());
  assert.equal(kv.report.readings, 2);
  const recs = convertText('r.json', '[{"astronaut":"Jun","metric":"sleep","date":"2026-11-16","value":6.5}]', core());
  assert.equal(recs.bundle.health['jun-park'].readings.sleep[0].value, 6.5);
});

test('same day: the newer file wins; dates stay ordered', () => {
  const first = apply('a.csv', 'astronaut,metric,date,value\nJun,HR,2026-12-01,70\n');
  const second = mergeData(first.data, bundleToData(convertText('b.csv', 'astronaut,metric,date,value\nJun,HR,2026-12-01,99\n', first.data).bundle), { validate: true });
  const series = second.data.health['jun-park'].readings['heart-rate'];
  assert.equal(series.at(-1).value, 99);
  assert.equal(series.filter((r) => r.date === '2026-12-01').length, 1);
});

test('broken files report an error instead of throwing; non-data files are only listed', async () => {
  assert.match(convertText('bad.json', '{oops', core()).report.error, /JSON/);
  assert.match(convertText('dup.csv', 'a,A\n1,2', core()).report.error, /duplicate/i);
  const file = (name, text) => ({ file: { name, size: text.length, text: async () => text }, path: `drop/${name}` });
  const { files } = await importFiles([file('ok.csv', 'astronaut,metric,date,value\nJun,HR,2026-12-02,60\n'), file('notes.txt', 'hello')], core());
  assert.deepEqual(files.map((f) => f.status), ['converted', 'stored']);
});

test('merging into an empty chunk keeps readings of existing astronauts for later', () => {
  const part = bundleToData(convertText('p.csv', 'astronaut,metric,date,value\nJun,HR,2026-12-03,61\n', core()).bundle);
  const chunk = mergeData(emptyData(), part, { partial: true }).data;
  assert.ok(chunk.health['jun-park']);
  mergeData(core(), chunk, { validate: true });
});
