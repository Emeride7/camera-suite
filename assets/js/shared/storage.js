export const STORAGE_PREFIX = 'suite.';

function safeParseJSON(str, fallback){
  try { return JSON.parse(str); } catch { return fallback; }
}

export const storage = {
  get(key, fallback){
    try{
      const v = localStorage.getItem(key);
      return v ? safeParseJSON(v, fallback) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key){
    try{ localStorage.removeItem(key); } catch {}
  }
};

export function todayISO(){
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tz).toISOString().slice(0,10);
}

export function uid(){
  return (crypto?.randomUUID)
    ? crypto.randomUUID()
    : ('id-' + Math.random().toString(16).slice(2) + Date.now());
}
