# Orbit Health 1.6.0 — Crew Monitoring Dashboard

Orbit Health is an offline-first browser prototype for exploring astronaut health monitoring, crew communication, and spacecraft environment telemetry. It uses synthetic demonstration readings, configurable example thresholds, and browser-local storage. It has no backend, analytics service, external font, or network API dependency.

> **Prototype notice:** This is not a medical device, spacecraft telemetry system, or clinical decision-support tool. All health readings, crew profiles, thresholds, environment data, alerts, and simulation events are synthetic. Do not use them for diagnosis, treatment, fitness-for-duty, or flight-safety decisions.

## Run locally

1. Extract the ZIP.
2. Open a terminal in the `orbit-health-app` folder (the folder containing `index.html`).
3. Start a local static server:

   **Windows**
   ```powershell
   py -m http.server 4173
   ```

   **macOS / Linux**
   ```bash
   python3 -m http.server 4173
   ```

4. Open <http://localhost:4173> in a modern browser.
5. Stop the server with **Ctrl + C** in the terminal when finished.

A local server is used because browsers restrict JavaScript modules when an HTML file is opened directly with `file://`. After the project files are on the device, the app itself runs offline.

## Screens

- **Overview:** Elena Voss's personal health metrics appear first in a two-column grid. Alerted metrics automatically sort above warnings and normal readings. Cards can be reordered within their severity group. Click a card to inspect its chart and configured threshold guides.
- **Crew summary:** A compact priority-monitoring area followed by one crew profile at a time. Each profile shows its avatar, a large static heartbeat trace, connectivity, and all eight health metrics in a two-column grid. Warning and critical readings receive tinted cards.
- **Crew comms:** One shared local group chat for the crew. Teammate status and seeded messages are synthetic; messages entered in the browser are stored locally.
- **Environment:** Space radiation is shown as a history line graph with an upper danger guide. The screen also shows distance from Earth, gravity (`NONE` when the simulated value is zero), five spacecraft cabin measurements (temperature, pressure, oxygen, carbon dioxide, and humidity), and an overall environment conclusion.
- **Activity log:** A local record of changed readings and simulated day transitions.
- **Debug:** An open local terminal and Factory Reset control. There is no password prompt.

## Skip Day simulation

Use **SKIP DAY** in the header to advance the local mission calendar by one day. Each skip creates new synthetic readings for the personal dashboard and teammate profiles, updates crew connectivity and spacecraft environment values, appends graph history, and may generate warning or critical situations. The simulation can also add an occasional teammate status message to Crew Comms.

The simulation is intentionally random and illustrative. It does not model real orbital mechanics, radiation exposure, medical physiology, or certified spacecraft environmental systems. It is a UI-testing feature only.

## Health metrics and charts

Included metrics are blood pressure, heart rate, blood glucose, body temperature, daily sleep, mood, muscle mass, and hydration.

When creating a custom metric, choose either a line chart or a column chart and optionally set lower/upper alert thresholds. Body temperature is configured as a column chart by default: the chart history represents daily averages, while the prominent value shows the latest/current reading. The simulation generates multiple temperature samples and stores the day's average separately.

Metric definitions are data-driven. Standard metrics are defined in `src/data/metricRegistry.js`. `evaluateMetric()` in `src/lib/health.js` evaluates threshold rules; supported operators are `gt`, `gte`, `lt`, `lte`, `eq`, and `in`. Rules can target `value` or a field inside an object-valued metric (such as systolic/diastolic blood pressure).

## AURA preview and expressions

The Crew Support display can use four custom expression images. Copy your images into `assets/` using these exact names:

```text
assets/
  ai_neutral.png
  ai_smile.png
  ai_frown.png
  ai_alert.png
```

If an image is missing, the built-in CSS character placeholder is displayed instead. The CRT frame has a subtly different background for each expression.

AURA chooses expressions only from the focused astronaut's health status and connectivity:

- **Neutral:** No readings are available yet.
- **Smile:** Health metrics are within their configured demo ranges and the connection is healthy.
- **Frown:** A warning exists or the connection is weak.
- **Alert:** A critical health flag exists or the connection is unavailable.

Chatting does not change AURA's expression. AURA's chat replies remain local rule-based placeholders; there is no connected language model.

## Theme, layout, and scrollbars

The app uses a single Matrix-inspired dark theme (`#050805` background, `#111A12` panels, and `#B6FF3B` accent). Scrollbars are hidden throughout the interface while wheel, touchpad, keyboard, and touch scrolling remain available. The left navigation starts collapsed. Crew Support remains sticky on wider screens and returns to normal page flow on narrow screens.

## Local storage and migration

Readings, custom metrics, metric chart choices, threshold settings, history, AURA messages, crew group-chat messages, selected crew focus, avatar, simulation day count, crew snapshots, environment readings, and graph histories are stored in browser `localStorage` under `orbit-health-state-v1`. Existing v1.5 data is migrated by adding new simulation fields with safe defaults and retaining saved metrics and thresholds.

Data is limited to the current browser profile/device; it is not synchronized or encrypted by this prototype. Use **Debug → Factory Reset** or the browser's site-data controls to restore demo state.

## Project structure

```text
orbit-health-app/
  index.html
  assets/README.txt             Instructions for adding custom AURA images
  src/
    app.js                      State, simulation, navigation, and interactions
    main.js                     App entry point
    styles.css                  Matrix theme, responsive layout, and components
    data/metricRegistry.js      Health metric definitions and defaults
    data/crewRegistry.js        Synthetic crew profiles
    lib/health.js                Local persistence and threshold evaluation
    lib/ui.js                    Shared UI helpers
    components/
      assistantRoom.js          Crew Support, AURA preview, summary, and chat
      crewComms.js              Shared crew group chat
      environment.js            Radiation, spacecraft environment, and conclusion
      metricCard.js              Health cards and line/column chart rendering
      metricDetails.js           Expanded metric details
      metricDialog.js            Add/update metric form
      trendChart.js              Shared chart helpers
```

## Safety and validation

All values and thresholds are synthetic examples. The random Skip Day scenarios are not medically or operationally meaningful. Before any real-world use, replace them with mission-approved data sources and thresholds validated by qualified medical and spacecraft-safety teams, and add authentication, authorization, encryption, audit controls, secure backup, and validated device integrations.
