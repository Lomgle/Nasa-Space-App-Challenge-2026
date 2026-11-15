import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildHealthImport } from "../src/lib/healthImport.js";
import { mergeCSVFiles } from "../src/lib/csv.js";
import { validateData } from "../src/data/validate.js";

const load = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), "utf8"));
const current = () => ({ astronauts: load("astronauts"), metrics: load("metrics"), health: load("health") });
const run = (csv) => buildHealthImport(mergeCSVFiles([{ name: "t.csv", content: csv }]), current());
const H = "astronaut_id,astronaut_name,role,date,metric,value,systolic,diastolic\n";

test("sample file applies cleanly: new, overwrite and new astronaut", () => {
  const sample = readFileSync(new URL("../sample/health-import-sample.csv", import.meta.url), "utf8");
  const r = run(sample);
  assert.deepEqual(r.errors, []);
  assert.equal(r.summary.readings, 7);
  assert.deepEqual(r.summary.newAstronauts, ["Sam Lee"]);
  const c = current();
  assert.deepEqual(validateData({ astronauts: r.next.astronauts, metrics: c.metrics, health: r.next.health }), []);
  const hr = r.next.health["elena-voss"].readings["heart-rate"];
  assert.equal(hr.at(-1).date, "2026-11-16");
  assert.equal(r.next.health["sam-lee"].readings["blood-pressure"][0].value.systolic, 121);
});

test("same astronaut/metric/date overwrites; older dates slot into history", () => {
  const c = current();
  const first = c.health["elena-voss"].readings["heart-rate"][0];
  const r = run(H + `elena-voss,,,${first.date},heart-rate,99,,\nelena-voss,,,2026-01-01,heart-rate,60,,\n`);
  assert.equal(r.ok, true);
  const s = r.next.health["elena-voss"].readings["heart-rate"];
  assert.equal(s.find((x) => x.date === first.date).value, 99);
  assert.equal(s[0].date, "2026-01-01");
  assert.equal(r.summary.overwritten, 1);
  assert.equal(r.summary.added, 1);
  assert.equal(s.length, c.health["elena-voss"].readings["heart-rate"].length + 1);
});

test("input data is never mutated", () => {
  const c = current();
  const before = JSON.stringify(c);
  buildHealthImport(mergeCSVFiles([{ name: "t.csv", content: H + "elena-voss,,,2026-12-01,heart-rate,70,,\n" }]), c);
  assert.equal(JSON.stringify(c), before);
});

test("any bad row blocks the entire import, with row numbers", () => {
  const r = run(H + "elena-voss,,,2026-12-01,heart-rate,70,,\njun-park,,,2026-12-01,bogus,1,,\nelena-voss,,,2026-02-31,heart-rate,70,,\nelena-voss,,,2026-12-02,heart-rate,abc,,\n");
  assert.equal(r.ok, false);
  assert.equal(r.next, null);
  const e = r.errors.join("|");
  assert.match(e, /Row 3: unknown metric "bogus"/);
  assert.match(e, /Row 4: date/);
  assert.match(e, /Row 5: heart-rate must be a positive number/);
  assert.doesNotMatch(e, /Row 2/);
});

test("value shapes per metric kind", () => {
  const bad = (row) => run(H + row).errors.join("|");
  assert.match(bad("elena-voss,,,2026-12-01,blood-pressure,120,,\n"), /systolic/);
  assert.match(bad("elena-voss,,,2026-12-01,blood-pressure,,80,120\n"), /diastolic lower/);
  assert.match(bad("elena-voss,,,2026-12-01,heart-rate,,70,\n"), /value" only/);
  assert.match(bad("elena-voss,,,2026-12-01,mood,Happy,,\n"), /one of Great/);
  assert.equal(run(H + "elena-voss,,,2026-12-01,mood,great,,\n").next.health["elena-voss"].readings.mood.at(-1).value, "Great");
});

test("duplicates, new astronaut without name, bad id, missing columns", () => {
  assert.match(run(H + "elena-voss,,,2026-12-01,heart-rate,70,,\nelena-voss,,,2026-12-01,heart-rate,71,,\n").errors.join("|"), /duplicate/);
  assert.match(run(H + "new-guy,,,2026-12-01,heart-rate,70,,\n").errors.join("|"), /astronaut_name is required/);
  assert.match(run(H + "Bad ID!,X,,2026-12-01,heart-rate,70,,\n").errors.join("|"), /lowercase letters/);
  assert.match(run("astronaut_id,date\nelena-voss,2026-12-01\n").errors.join("|"), /Missing required column "metric"/);
  assert.match(run("astronaut_id,date,metric,extra\nelena-voss,2026-12-01,heart-rate,1\n").errors.join("|"), /Unknown column/);
});

test("multiple files are merged before validation", () => {
  const r = buildHealthImport(mergeCSVFiles([
    { name: "a.csv", content: H + "elena-voss,,,2026-12-01,heart-rate,70,,\n" },
    { name: "b.csv", content: "date,metric,value,astronaut_id\n2026-12-01,sleep,7,jun-park\n" },
  ]), current());
  assert.equal(r.ok, true);
  assert.equal(r.summary.readings, 2);
});
