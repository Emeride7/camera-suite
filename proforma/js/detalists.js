import { storage } from '../../assets/js/shared/storage.js';

const KEY_CLIENTS = 'suite.invoice.clients.v1';
const KEY_ITEMS = 'suite.invoice.items.v1';

export function getStoredClients(){
  const v = storage.get(KEY_CLIENTS, []);
  return Array.isArray(v) ? v : [];
}
export function getStoredItems(){
  const v = storage.get(KEY_ITEMS, []);
  return Array.isArray(v) ? v : [];
}

export function upsertClient(client){
  const list = getStoredClients();
  const name = (client?.name || '').trim();
  if (!name) return;
  const idx = list.findIndex(c => (c.name || '').trim().toLowerCase() === name.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...client };
  else list.unshift(client);
  storage.set(KEY_CLIENTS, list.slice(0, 100));
}

export function upsertItem(item){
  const list = getStoredItems();
  const desc = (item?.description || '').trim();
  if (!desc) return;
  const idx = list.findIndex(i => (i.description || '').trim().toLowerCase() === desc.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...item };
  else list.unshift(item);
  storage.set(KEY_ITEMS, list.slice(0, 200));
}

export function renderClientDatalist(datalistEl){
  const clients = getStoredClients();
  datalistEl.innerHTML = '';
  for (const c of clients){
    const opt = document.createElement('option');
    opt.value = c.name || '';
    datalistEl.appendChild(opt);
  }
}

export function renderItemDatalist(datalistEl){
  const items = getStoredItems();
  datalistEl.innerHTML = '';
  for (const it of items){
    const opt = document.createElement('option');
    opt.value = it.description || '';
    datalistEl.appendChild(opt);
  }
}

export function findClientByName(name){
  const s = (name || '').trim().toLowerCase();
  if (!s) return null;
  return getStoredClients().find(c => (c.name || '').trim().toLowerCase() === s) || null;
}

export function findItemByDescription(desc){
  const s = (desc || '').trim().toLowerCase();
  if (!s) return null;
  return getStoredItems().find(i => (i.description || '').trim().toLowerCase() === s) || null;
}
