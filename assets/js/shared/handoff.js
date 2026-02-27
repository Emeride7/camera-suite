import { storage } from './storage.js';

const HANDOFF_KEY = 'suite.handoff.v1';

/**
 * Transfert simple entre apps (localStorage).
 * Exemple : Maintenance -> Proforma (lignes + meta).
 */
export function setHandoff(payload){
  storage.set(HANDOFF_KEY, {
    createdAt: new Date().toISOString(),
    payload
  });
}

export function consumeHandoff(){
  const v = storage.get(HANDOFF_KEY, null);
  if (!v?.payload) return null;
  storage.remove(HANDOFF_KEY);
  return v.payload;
}
