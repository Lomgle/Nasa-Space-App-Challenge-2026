import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateData } from '../src/data/validate.js';

const fresh = () => Object.fromEntries(['astronauts', 'metrics', 'health'].map((n) => [n, JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), 'utf8'))]));
const check = (d) => validateData({ astronauts: d.astronauts, metrics: d.metrics, health: d.health });

test('shipped data is valid', () => assert.deepEqual(check(fresh()), []));
test('unknown metric in health is rejected', () => { const d = fresh(); d.health['jun-park'].readings.bogus = [{ date: '2026-11-15', value: 1 }]; assert.match(check(d)[0], /unknown metric "bogus"/); });
test('unordered dates are rejected', () => { const d = fresh(); d.health['elena-voss'].readings['heart-rate'].reverse(); assert.ok(check(d).some((e) => /oldest -> newest/.test(e))); });
test('astronaut without health, and two defaults, are rejected', () => { const d = fresh(); delete d.health['mateo-ruiz']; d.astronauts[1].default = true; const e = check(d).join('|'); assert.match(e, /missing entry for "mateo-ruiz"/); assert.match(e, /exactly one/); });
test('wrong value shape is rejected', () => { const d = fresh(); d.health['elena-voss'].readings['blood-pressure'][0].value = 120; assert.ok(check(d).some((e) => /not valid for kind/.test(e))); });
