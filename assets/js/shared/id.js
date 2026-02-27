import { storage } from './storage.js';

const COUNTERS_KEY = 'suite.counters.v1';

function pad3(n){ return String(n).padStart(3, '0'); }
function yearFromISO(iso){
  const y = String(iso || '').slice(0,4);
  return /^\d{4}$/.test(y) ? y : String(new Date().getFullYear());
}

/**
 * nextId({ kind: 'RM'|'PF'|'F', prefix: 'RM'|'PF'|'F', dateISO: 'YYYY-MM-DD' })
 * => "RM-2026-001"
 */
export function nextId({ kind, prefix, dateISO }){
  const year = yearFromISO(dateISO);
  const counters = storage.get(COUNTERS_KEY, {});
  const key = `${kind}:${year}`;
  const next = (counters[key] || 0) + 1;
  counters[key] = next;
  storage.set(COUNTERS_KEY, counters);
  return `${prefix}-${year}-${pad3(next)}`;
}
