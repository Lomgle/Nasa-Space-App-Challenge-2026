# Orbit Health

https://lomgle.github.io/Nasa-Space-App-Challenge-2026/

## Run locally

Use Node.js 18 or newer, then run:

```bash
npm start
```

Import data (sidebar): upload one or more long-format CSVs (see `sample/health-import-sample.csv` or the **Download template CSV** button). The app validates the merged file and shows a review; **Apply** saves it in the browser as the new base data (overwriting matching astronaut + metric + date, creating new astronauts). Any invalid row blocks the whole import. **Factory reset** (Debug) removes imported data and restores `data/*.json`.
