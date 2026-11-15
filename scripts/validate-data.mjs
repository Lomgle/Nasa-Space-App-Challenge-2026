// Usage: npm run validate   (checks data/*.json before you deploy)
import { readFileSync } from 'node:fs';
import { validateData } from '../src/data/validate.js';

const read = (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const problems = validateData({ astronauts: read('astronauts'), metrics: read('metrics'), health: read('health') });
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('data OK');
