# file_directory_function

Reads files you drop on the website and converts them to the format of the three data files
(`data/astronauts.json`, `data/metrics.json`, `data/health.json`) so the readings can appear on the dashboard.

| File | Job |
|---|---|
| `aliases.js` | Keyword lists (`HR`, `pulse` → `heart-rate`, column names, …). Add your own spellings here. |
| `readers.js` | Reads dropped files and whole folders. |
| `converters.js` | CSV / TSV / JSON → `{ astronauts, metrics, health }` in the exact data-file shape. |
| `merge.js` | Adds converted data to the existing data. Never overwrites existing crew or metric definitions; readings merge by date. |
| `index.js` | Public API + startup loader used by `src/data/store.js` (loads `real_data/` and saved imports). |
| `directory.js` / `directory.css` | The **File directory** page, the drop overlay and the preview/Apply flow. |

## File formats it understands

- **Long CSV** — `astronaut, metric, date, value [, unit]` (one reading per row). `systolic` and `diastolic` rows are combined into blood pressure.
- **Wide CSV** — `date, astronaut, Heart rate (bpm), Sleep (h), Systolic, Diastolic, …` (one column per metric).
- **JSON** — an array of records, a plain `{ "heart rate": 72 }` object, or a copy of the data files (`{ astronauts, metrics, health }`).
- Dates: `2026-11-16` or `16/11/2026` (day first). Rows without a date get consecutive days ending today, with a warning.
- Crew are matched by id, full name, first name or initials. Metrics by id, name or alias. Unknown crew / metrics are **created** in the data-file format.
- Other files (txt, md, pdf, images, xlsx) are listed but not converted.

## From the command line

```bash
node scripts/convert-file.mjs mydata.csv real_data/my-study   # writes astronauts.json, metrics.json, health.json
npm run validate && npm test
```
