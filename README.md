# Orbit Health

https://lomgle.github.io/Nasa-Space-App-Challenge-2026/

## Run locally

Use Node.js 18 or newer, then run:

```bash
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The local server supports CSV imports and saves the merged dataset to `raw_data/merged.csv`. Import metadata is stored alongside it in `raw_data/import-manifest.json`. These raw data files are excluded from source control by `.gitignore`.

When the app is hosted on a static server (including GitHub Pages), the browser can still merge and display selected CSV files, but it cannot write into the hosted project folder. In that case the app downloads `merged.csv`; place it in `raw_data/` manually if you also need a local copy.
