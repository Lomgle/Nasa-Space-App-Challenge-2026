import test from "node:test";
import assert from "node:assert/strict";
import { importDataPage } from "../src/components/importData.js";

test("import page provides a multi-file CSV picker and keeps the preview paginated", () => {
  const rows = Array.from({ length: 51 }, (_, index) => [`Crew ${index + 1}`]);
  const html = importDataPage({
    dataset: {
      headers: ["Crew"],
      rows,
      sourceFiles: ["crew.csv"],
      importedAt: "2026-11-15T00:00:00.000Z",
    },
  });

  assert.match(html, /id="csv-upload" type="file"[^>]*multiple/);
  assert.match(html, /data-action="download-import"/);
  assert.match(html, /Crew 1/);
  assert.doesNotMatch(html, /Crew 51/);
  assert.match(html, /data-action="import-page-next"/);
});
