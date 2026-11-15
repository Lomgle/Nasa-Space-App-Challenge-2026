// Keyword tables. Everything is compared after norm(): lower-case, letters/digits only, single spaces.
// To teach the importer a new spelling, add it to the matching list below.
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const slug = (s) => norm(s).replace(/ /g, '-') || 'item';
export const MOODS = ['Strained', 'Low', 'Steady', 'Great']; // mood score 1..4, same as data/metrics.json

// metric id (data/metrics.json) -> other names a file may use for it
export const METRIC_ALIASES = {
  'blood-pressure': ['blood pressure', 'bp', 'arterial pressure'],
  'heart-rate': ['heart rate', 'hr', 'pulse', 'pulse rate', 'bpm', 'resting heart rate'],
  'blood-sugar': ['blood glucose', 'glucose', 'blood sugar', 'bg'],
  temperature: ['body temperature', 'core temperature', 'core temp', 'temp', 'body temp', 'cbt'],
  sleep: ['daily sleep', 'sleep duration', 'sleep hours', 'sleep time'],
  mood: ['mood check in', 'wellbeing', 'mental state'],
  'muscle-mass': ['muscle mass', 'lean mass', 'skeletal muscle mass', 'lean body mass'],
  hydration: ['fluid intake', 'water intake', 'water', 'fluid']
};

// what a column header means (long and wide layouts)
export const ROLE_ALIASES = {
  astronaut: ['astronaut', 'astronaut id', 'astronaut name', 'crew', 'crew member', 'crewmember', 'subject', 'participant', 'person', 'id'],
  metric: ['metric', 'measurement', 'parameter', 'variable', 'test', 'vital', 'observation'],
  value: ['value', 'result', 'reading', 'measure', 'amount'],
  date: ['date', 'day', 'timestamp', 'time', 'datetime', 'recorded', 'recorded at'],
  unit: ['unit', 'units', 'uom'],
  systolic: ['systolic', 'systolic bp', 'sys'],
  diastolic: ['diastolic', 'diastolic bp', 'dia']
};

/** "Heart rate (bpm)" -> { name: "Heart rate", unit: "bpm" } */
export function stripUnit(header) {
  const m = String(header ?? '').match(/^(.*?)\s*[(\[]([^)\]]*)[)\]]\s*$/);
  return m ? { name: m[1].trim(), unit: m[2].trim() } : { name: String(header ?? '').trim(), unit: '' };
}
export const roleOf = (header) => {
  const n = norm(stripUnit(header).name);
  return Object.keys(ROLE_ALIASES).find((r) => ROLE_ALIASES[r].includes(n));
};
