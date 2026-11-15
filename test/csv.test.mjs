import test from "node:test";
import assert from "node:assert/strict";
import { mergeCSVFiles, parseCSV, serializeCSV } from "../src/lib/csv.js";

test("CSV parser handles quoted commas, doubled quotes, and embedded newlines", () => {
  const parsed = parseCSV('name,note\r\n"Voss, Elena","Said ""ready"""\r\nJun,"line one\nline two"\r\n');
  assert.deepEqual(parsed.headers, ["name", "note"]);
  assert.deepEqual(parsed.rows, [
    ["Voss, Elena", 'Said "ready"'],
    ["Jun", "line one\nline two"],
  ]);
});

test("multiple files merge by header name and retain columns unique to each file", () => {
  const merged = mergeCSVFiles([
    { name: "first.csv", content: "Name,Heart Rate\nElena,72\nJun,68\n" },
    { name: "second.csv", content: "heart rate,Name,Hydration\n75,Amara,2.1\n" },
  ]);
  assert.deepEqual(merged.headers, ["Name", "Heart Rate", "Hydration"]);
  assert.deepEqual(merged.rows, [
    ["Elena", "72", ""],
    ["Jun", "68", ""],
    ["Amara", "75", "2.1"],
  ]);
  assert.deepEqual(merged.sourceFiles, ["first.csv", "second.csv"]);
});

test("serialized merged data can be parsed again without losing values", () => {
  const headers = ["Crew member", "Observation"];
  const rows = [["Elena", "stable, nominal"], ["Jun", 'Reported "ready"']];
  assert.deepEqual(parseCSV(serializeCSV(headers, rows)), { headers, rows });
});

test("CSV parser rejects unclosed quotes and duplicate headers", () => {
  assert.throws(() => parseCSV('name,note\nElena,"unfinished'), /unclosed quoted field/i);
  assert.throws(() => parseCSV("Name,name\nElena,Elena"), /duplicate column/i);
});

test("CSV parser rejects rows with more cells than the header", () => {
  assert.throws(() => parseCSV("name,rate\nElena,72,extra"), /more values than the header/i);
});
