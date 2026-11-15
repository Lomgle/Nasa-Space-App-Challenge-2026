# real_data – where every number comes from

These three files use **exactly the same keys as `data/astronauts.json`, `data/metrics.json` and `data/health.json`**, so the website
loads them without any conversion. `manifest.json` tells the site which data sets to load (set `"enabled": false` to switch one off).

Every entry is one **published study cohort**. The values are the group results the authors report (means or average changes),
not individual astronaut telemetry. Individual NASA records are not public.

| Cohort id | Metric id → value | Source |
|---|---|---|
| `barger-2014-iss-sleep` | `sleep` → **6.09** h/night (n = 21 ISS astronauts) | Barger LK, Flynn-Evans EE, Kubey A, Walsh L, Ronda JM, Wang W, Wright KP, Czeisler CA. *The Lancet Neurology*, published 8 Aug 2014. Mean sleep during ISS missions; 8.5 h is scheduled. |
| `barger-2014-shuttle-sleep` | `sleep` → **5.96** h/night (n = 64 shuttle astronauts, 80 missions) | same paper |
| `stahn-2017-iss-thermal` | `core-temp-rest-change` → **+1.01** °C · `core-temp-exercise-change` → **+1.39** °C (n = 11) | Stahn AC, Werner A, Opatz O, et al. *Scientific Reports* 7:16180 (2017). doi:10.1038/s41598-017-15560-w. Six-month ISS stays, change vs pre-flight baseline. |
| `norsk-2015-iss-cardiovascular` | `systolic-change` → **−8** mmHg · `diastolic-change` → **−9** mmHg · `cardiac-output-change` → **+41** % (n = 8) | Norsk P, Asmar A, Damgaard M, Christensen NJ. *The Journal of Physiology* 593(3):573–584 (2015). doi:10.1113/jphysiol.2014.284869. 24 h ambulatory averages, 85–192 days in space vs pre-launch. |
| `trappe-2009-iss-muscle` | `calf-muscle-volume-change` → **−13** % · `calf-peak-power-change` → **−32** % (n = 9) | Trappe S, Costill D, Gallagher P, et al. *Journal of Applied Physiology* 106(4):1159–1168 (2009). doi:10.1152/japplphysiol.91578.2008. MRI before/after six months on the ISS. |

## Read this before you present the data

- **Dates are publication dates.** The papers report one summary per study, not a day-by-day series, so each reading is dated with the day the study was published (shown as the card's date). Nothing was interpolated or invented.
- **`…-change` metrics are differences from the study's own pre-flight baseline.** The abstracts give changes, not absolute values, so absolute blood pressure and core temperature are deliberately not shown.
- **Rounding on screen.** The existing `sleep` metric shows one decimal, so 6.09 appears as 6.1 h and 5.96 as 6.0 h. The stored values are exact. 5.96 is below the site's 6 h sleep target, so that card is flagged by the site's own rule.
- **Verified from abstracts and the open-access Stahn paper.** The Norsk paper's full text could not be opened when this was prepared, so its numbers come from the published abstract. Please check each number against the paper before presenting.
- These are research summaries for a demo dashboard, not medical advice.

## Adding more real data

1. Put the numbers in a CSV/JSON file and drop it on the **File directory** page (or run `node scripts/convert-file.mjs yourfile.csv real_data/my-study`).
2. Copy the three generated files into `real_data/`, add a block to `manifest.json`, and run `npm run validate` and `npm test`.
3. Add a row to the table above with the source, so every number stays traceable.
