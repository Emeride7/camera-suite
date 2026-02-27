import { storage, todayISO, uid } from '../../assets/js/shared/storage.js';
import { nextId } from '../../assets/js/shared/id.js';
import { consumeHandoff } from '../../assets/js/shared/handoff.js';

import {
  renderClientDatalist, renderItemDatalist,
  upsertClient, upsertItem,
  findClientByName, findItemByDescription
} from './datalists.js';

import { exportPDF } from './export/pdf.js';
import { exportExcel } from './export/excel.js';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const STORAGE = {
  draft: 'suite.invoice.draft.v1',
  history: 'suite.invoice.history.v1',
};

const fmtMoney = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const refs = {
  btnHistory: $('#btnHistory'),
  btnArchive: $('#btnArchive'),
  btnNew: $('#btnNew'),
  btnPdf: $('#btnPdf'),
  btnExcel: $('#btnExcel'),

  btnProforma: $('#btnProforma'),
  btnFacture: $('#btnFacture'),

  itemsBody: $('#itemsBody'),
  addRow: $('#addRow'),

  vatRate: $('#vatRate'),
  vatRateDisplay: $('#vatRateDisplay'),
  vatRow: $('#vatRow'),
  currency: $('#currency'),

  docTitle: $('#docTitle'),
  docNumber: $('#docNumber'),
  docDate: $('#docDate'),

  emitterName: $('#emitterName'),
  emitterAddress: $('#emitterAddress'),
  emitterExtra: $('#emitterExtra'),
  emitterTel: $('#emitterTel'),

  clientSectionLabel: $('#clientSectionLabel'),
  clientName: $('#clientName'),
  clientAddress: $('#clientAddress'),
  clientExtra: $('#clientExtra'),
  clientIfu: $('#clientIfu'),

  logoUpload: $('#logoUpload'),
  logoPreview: $('#logoPreview'),
  logoPlaceholder: $('#logoPlaceholder'),

  footerBrand: $('#footerBrand'),

  historyOverlay: $('#historyOverlay'),
  historyList: $('#historyList'),
  historySearch: $('#historySearch'),
  btnCloseHistory: $('#btnCloseHistory'),

  toast: $('#toast'),

  clientDatalist: $('#clientDatalist'),
  itemDatalist: $('#itemDatalist'),
};

const state = {
  mode: 'proforma',
  logoDataURL: null,
  draftId: uid(),
  _saveTimer: null
};

function showToast(msg, type='info', duration=2500){
  refs.toast.textContent = msg;
  refs.toast.style.background = (type==='error')
    ? 'rgba(127,29,29,.98)'
    : (type==='success' ? 'rgba(20,83,45,.98)' : 'rgba(30,60,114,.98)');
  refs.toast.classList.add('show');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => refs.toast.classList.remove('show'), duration);
}

function clampNumber(n, min=0){
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, x);
}

function cleanSpaces(s){
  return String(s || '').replace(/\u202f/g,' ').replace(/\s+/g,' ').trim();
}

function getDataUrlMime(dataUrl){
  const m = /^data:(image\/(png|jpeg|jpg));base64,/i.exec(String(dataUrl||''));
  if (!m) return null;
  const mime = m[1].toLowerCase();
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

async function downscaleImageToDataURL(file, {max=320, quality=0.85}={}){
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const isPng = (file.type || '').toLowerCase() === 'image/png';
  const mime = isPng ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mime, mime==='image/jpeg' ? quality : undefined);
}

/* ------- Rows (safe DOM) ------- */
function createItemRow(item){
  const tr = document.createElement('tr');
  tr.dataset.itemId = item.id;

  const tdDesc = document.createElement('td');
  const inpDesc = document.createElement('input');
  inpDesc.type = 'text';
  inpDesc.className = 'itemInput';
  inpDesc.placeholder = 'Description';
  inpDesc.value = item.description || '';
  inpDesc.setAttribute('data-field','description');
  inpDesc.setAttribute('list','itemDatalist');
  tdDesc.appendChild(inpDesc);

  const tdQty = document.createElement('td');
  const inpQty = document.createElement('input');
  inpQty.type = 'number';
  inpQty.className = 'itemInput num';
  inpQty.min = '0';
  inpQty.step = '0.01';
  inpQty.inputMode = 'decimal';
  inpQty.value = String(item.qty ?? 1);
  inpQty.setAttribute('data-field','qty');
  tdQty.appendChild(inpQty);

  const tdPrice = document.createElement('td');
  const inpPrice = document.createElement('input');
  inpPrice.type = 'number';
  inpPrice.className = 'itemInput num';
  inpPrice.min = '0';
  inpPrice.step = '0.01';
  inpPrice.inputMode = 'decimal';
  inpPrice.value = String(item.price ?? 0);
  inpPrice.setAttribute('data-field','price');
  tdPrice.appendChild(inpPrice);

  const tdTotal = document.createElement('td');
  tdTotal.className = 'lineTotal';
  tdTotal.textContent = fmtMoney.format(clampNumber(item.qty) * clampNumber(item.price));

  const tdActions = document.createElement('td');
  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'rmBtn';
  btnDel.textContent = 'Suppr.';
  btnDel.dataset.action = 'remove-row';
  tdActions.appendChild(btnDel);

  tr.append(tdDesc, tdQty, tdPrice, tdTotal, tdActions);
  return tr;
}

function addItemRow(item = {id: uid(), description:'', qty:1, price:0}, {focus=false}={}){
  refs.itemsBody.appendChild(createItemRow(item));
  if (focus) refs.itemsBody.lastElementChild?.querySelector('input')?.focus();
  updateTotals();
  scheduleSave();
}

function ensureAtLeastOneRow(){
  if (refs.itemsBody.children.length === 0){
    addItemRow({id: uid(), description:'', qty:1, price:0});
  }
}

/* ------- Totals ------- */
function computeSubtotal(){
  let subtotal = 0;
  for (const tr of refs.itemsBody.rows){
    const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
    const price = clampNumber(tr.querySelector('[data-field="price"]').value);
    subtotal += qty * price;
  }
  return subtotal;
}

function updateCurrencyDisplay(){
  const curr = (refs.currency.value || 'CFA').trim() || 'CFA';

  $$('.curr').forEach(el => el.textContent = curr);
}

function updateTotals(){
  for (const tr of refs.itemsBody.rows){
    const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
    const price = clampNumber(tr.querySelector('[data-field="price"]').value);
    tr.querySelector('.lineTotal').textContent = fmtMoney.format(qty * price);
  }

  const subtotal = computeSubtotal();
  const vatRate = clampNumber(refs.vatRate.value);
  refs.vatRateDisplay.textContent = String(vatRate);

  const tax = subtotal * vatRate / 100;
  const total = subtotal + tax;

  $('#subtotal').textContent = fmtMoney.format(subtotal);
  $('#totalTax').textContent = fmtMoney.format(tax);
  $('#grandTotal').textContent = fmtMoney.format(total);

  refs.vatRow.style.display = vatRate > 0 ? '' : 'none';
}

/* ------- Mode + numbering ------- */
function setMode(mode){
  state.mode = mode;

  refs.docTitle.textContent = (mode === 'facture') ? 'FACTURE' : 'PRO FORMA';
  refs.clientSectionLabel.textContent = (mode === 'facture') ? 'FACTURÉ À' : 'CLIENT';

  refs.btnProforma.classList.toggle('active', mode === 'proforma');
  refs.btnFacture.classList.toggle('active', mode === 'facture');
  refs.btnProforma.setAttribute('aria-selected', String(mode === 'proforma'));
  refs.btnFacture.setAttribute('aria-selected', String(mode === 'facture'));

  // numérotation
  const dateISO = refs.docDate.value || todayISO();
  if (!refs.docNumber.value.trim()){
    refs.docNumber.value = (mode === 'facture')
      ? nextId({ kind:'F', prefix:'F', dateISO })
      : nextId({ kind:'PF', prefix:'PF', dateISO });
  }

  scheduleSave();
}

/* ------- Draft model ------- */
function collectData(){
  const items = [];
  for (const tr of refs.itemsBody.rows){
    items.push({
      id: tr.dataset.itemId || uid(),
      description: tr.querySelector('[data-field="description"]').value || '',
      qty: clampNumber(tr.querySelector('[data-field="qty"]').value),
      price: clampNumber(tr.querySelector('[data-field="price"]').value)
    });
  }

  return {
    id: state.draftId,
    mode: state.mode,
    docNumber: (refs.docNumber.value || '').trim(),
    docDate: refs.docDate.value || '',
    currency: (refs.currency.value || 'CFA').trim(),
    vatRate: clampNumber(refs.vatRate.value),
    emitter: {
      name: refs.emitterName.value || '',
      address: refs.emitterAddress.value || '',
      extra: refs.emitterExtra.value || '',
      tel: refs.emitterTel.value || ''
    },
    client: {
      name: refs.clientName.value || '',
      address: refs.clientAddress.value || '',
      extra: refs.clientExtra.value || '',
      ifu: refs.clientIfu.value || ''
    },
    logo: state.logoDataURL,
    items,
    updatedAt: new Date().toISOString()
  };
}

function applyData(data){
  state.draftId = data?.id || uid();

  setMode(data?.mode || 'proforma');

  refs.emitterName.value = data?.emitter?.name || '';
  refs.emitterAddress.value = data?.emitter?.address || '';
  refs.emitterExtra.value = data?.emitter?.extra || '';
  refs.emitterTel.value = data?.emitter?.tel || '';

  refs.clientName.value = data?.client?.name || '';
  refs.clientAddress.value = data?.client?.address || '';
  refs.clientExtra.value = data?.client?.extra || '';
  refs.clientIfu.value = data?.client?.ifu || '';

  refs.docDate.value = data?.docDate || todayISO();
  refs.docNumber.value = data?.docNumber || '';

  refs.currency.value = data?.currency || 'CFA';
  refs.vatRate.value = (data?.vatRate ?? 18);

  // logo
  if (data?.logo){
    state.logoDataURL = data.logo;
    refs.logoPreview.src = state.logoDataURL;
    refs.logoPreview.style.display = 'block';
    refs.logoPlaceholder.style.display = 'none';
  } else {
    state.logoDataURL = null;
    refs.logoPreview.style.display = 'none';
    refs.logoPlaceholder.style.display = 'flex';
  }

  refs.footerBrand.textContent = refs.emitterName.value || 'Votre entreprise';

  // items
  refs.itemsBody.innerHTML = '';
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length){
    items.forEach(it => refs.itemsBody.appendChild(createItemRow(it)));
  } else {
    addItemRow({id: uid(), description:'', qty:1, price:0});
  }

  // datalists
  renderClientDatalist(refs.clientDatalist);
  renderItemDatalist(refs.itemDatalist);

  updateCurrencyDisplay();
  updateTotals();
}

/* ------- Autosave ------- */
function scheduleSave(){
  window.clearTimeout(state._saveTimer);
  state._saveTimer = window.setTimeout(saveDraft, 450);
}

function saveDraft(){
  const ok = storage.set(STORAGE.draft, collectData());
  refs.footerBrand.textContent = refs.emitterName.value || 'Votre entreprise';
  if (!ok) showToast('⚠️ Impossible de sauvegarder (quota ou mode privé).', 'error', 3200);

  // update datalists memory
  upsertClient({
    name: refs.clientName.value || '',
    address: refs.clientAddress.value || '',
    extra: refs.clientExtra.value || '',
    ifu: refs.clientIfu.value || ''
  });

  // store items for autocomplete (desc + last price)
  for (const tr of refs.itemsBody.rows){
    const description = tr.querySelector('[data-field="description"]').value || '';
    const price = clampNumber(tr.querySelector('[data-field="price"]').value);
    if (description.trim()) upsertItem({ description, price });
  }

  renderClientDatalist(refs.clientDatalist);
  renderItemDatalist(refs.itemDatalist);
}

function loadDraft(){
  const d = storage.get(STORAGE.draft, null);
  if (d){ applyData(d); return; }

  // default new draft
  applyData({
    id: uid(),
    mode: 'proforma',
    docDate: todayISO(),
    vatRate: 18,
    currency: 'CFA',
    items: [{id: uid(), description:'', qty:1, price:0}]
  });

  // force first number
  refs.docNumber.value = nextId({ kind:'PF', prefix:'PF', dateISO: refs.docDate.value });
  scheduleSave();
}

/* ------- History ------- */
function getHistory(){
  const h = storage.get(STORAGE.history, []);
  return Array.isArray(h) ? h : [];
}
function saveHistory(hist){
  storage.set(STORAGE.history, hist.slice(0, 50));
}
function archiveCurrentDocument(){
  const data = collectData();
  data.savedAt = new Date().toISOString();
  const hist = getHistory();
  hist.unshift(data);
  saveHistory(hist);
  showToast('💾 Document sauvegardé dans l’historique', 'success');
}
function historyMatches(item, q){
  if (!q) return true;
  const s = q.toLowerCase();
  return [
    item?.docNumber,
    item?.client?.name,
    item?.docDate,
    item?.mode
  ].filter(Boolean).join(' ').toLowerCase().includes(s);
}
function renderHistory(){
  const q = (refs.historySearch.value || '').trim();
  const hist = getHistory().filter(it => historyMatches(it, q));

  refs.historyList.innerHTML = '';
  if (hist.length === 0){
    const d = document.createElement('div');
    d.className = 'muted';
    d.style.padding = '18px';
    d.textContent = q ? 'Aucun résultat.' : 'Aucun document sauvegardé.';
    refs.historyList.appendChild(d);
    return;
  }

  hist.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'histItem';

    const t = document.createElement('div');
    t.className = 'histTitle';
    t.textContent = `${(item.mode === 'facture' ? 'FACTURE' : 'PRO FORMA')} — ${item.docNumber || 'Sans numéro'}`;

    const sub = document.createElement('div');
    sub.className = 'histSub';
    sub.textContent = `${item.docDate || ''} • ${item.client?.name || ''}`;

    const actions = document.createElement('div');
    actions.className = 'histActions';

    const btnLoad = document.createElement('button');
    btnLoad.type = 'button';
    btnLoad.className = 'hbtn hbtn--load';
    btnLoad.textContent = 'Charger';
    btnLoad.addEventListener('click', () => {
      applyData(item);
      closeHistory();
      showToast('Document chargé.', 'success');
      scheduleSave();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'hbtn hbtn--del';
    btnDel.textContent = 'Supprimer';
    btnDel.addEventListener('click', () => {
      if (!confirm('Supprimer ce document de l’historique ?')) return;
      const h = getHistory();
      h.splice(idx, 1);
      saveHistory(h);
      renderHistory();
      showToast('Document supprimé.', 'success');
    });

    actions.append(btnLoad, btnDel);
    div.append(t, sub, actions);
    refs.historyList.appendChild(div);
  });
}

function openHistory(){
  renderHistory();
  refs.historyOverlay.classList.add('open');
  refs.historyOverlay.setAttribute('aria-hidden','false');
  refs.historySearch.value = '';
  refs.historySearch.focus();
}
function closeHistory(){
  refs.historyOverlay.classList.remove('open');
  refs.historyOverlay.setAttribute('aria-hidden','true');
}

/* ------- Export helpers ------- */
function ensurePdfRoom(doc, neededY){
  if (neededY > 280){
    doc.addPage();
    return 20;
  }
  return neededY;
}

function validateBeforeExport(){
  if (!refs.docNumber.value.trim()){
    showToast('Veuillez renseigner un numéro de document.', 'error');
    refs.docNumber.focus();
    return false;
  }
  ensureAtLeastOneRow();
  const hasAny = Array.from(refs.itemsBody.rows).some(tr => {
    const desc = tr.querySelector('[data-field="description"]').value.trim();
    const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
    const price = clampNumber(tr.querySelector('[data-field="price"]').value);
    return desc && (qty > 0 || price > 0);
  });
  if (!hasAny){
    showToast('Ajoute au moins une prestation (description).', 'error');
    return false;
  }
  return true;
}

/* ------- New doc ------- */
function newDocument(){
  const dateISO = todayISO();
  state.logoDataURL = null;

  refs.emitterName.value = '';
  refs.emitterAddress.value = '';
  refs.emitterExtra.value = '';
  refs.emitterTel.value = '';

  refs.clientName.value = '';
  refs.clientAddress.value = '';
  refs.clientExtra.value = '';
  refs.clientIfu.value = '';

  refs.docDate.value = dateISO;
  refs.docNumber.value = (state.mode === 'facture')
    ? nextId({kind:'F', prefix:'F', dateISO})
    : nextId({kind:'PF', prefix:'PF', dateISO});

  refs.currency.value = 'CFA';
  refs.vatRate.value = 18;

  refs.itemsBody.innerHTML = '';
  addItemRow({id: uid(), description:'', qty:1, price:0}, {focus:true});

  refs.logoPreview.style.display = 'none';
  refs.logoPlaceholder.style.display = 'flex';

  updateCurrencyDisplay();
  updateTotals();
  scheduleSave();

  showToast('Nouveau document.', 'success');
}

/* ------- Handoff from maintenance ------- */
function applyHandoffIfAny(){
  const h = consumeHandoff();
  if (!h) return;

  // Ensure at least we have a doc
  if (!refs.docDate.value) refs.docDate.value = todayISO();

  // Prefill items
  refs.itemsBody.innerHTML = '';
  const items = Array.isArray(h.items) ? h.items : [];
  if (items.length){
    items.forEach(it => addItemRow({ id: uid(), description: it.description || '', qty: it.qty ?? 1, price: it.price ?? 0 }));
  } else {
    addItemRow({id: uid(), description:'Prestation (à préciser)', qty:1, price:0});
  }

  // Put report reference in client extra as a trace (simple)
  const trace = h.reportId ? `Réf. rapport maintenance: ${h.reportId}` : 'Import maintenance';
  refs.clientExtra.value = (refs.clientExtra.value || '').trim()
    ? `${refs.clientExtra.value} — ${trace}`
    : trace;

  // Also align date if provided
  if (h.reportDateISO) refs.docDate.value = h.reportDateISO;

  // Regenerate doc number if empty
  if (!refs.docNumber.value.trim()){
    const dateISO = refs.docDate.value || todayISO();
    refs.docNumber.value = nextId({ kind:'PF', prefix:'PF', dateISO });
  }

  updateTotals();
  scheduleSave();
  showToast('Lignes importées depuis la maintenance.', 'success', 3200);
}

/* ------- Events ------- */
function bindEvents(){
  refs.btnProforma.addEventListener('click', () => setMode('proforma'));
  refs.btnFacture.addEventListener('click', () => setMode('facture'));

  refs.addRow.addEventListener('click', () => addItemRow({id: uid(), description:'', qty:1, price:0}, {focus:true}));

  // delegate inputs
  refs.itemsBody.addEventListener('input', (e) => {
    if (e.target.matches('[data-field="qty"], [data-field="price"], [data-field="description"]')){
      updateTotals();
      scheduleSave();
    }
  });

  refs.itemsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="remove-row"]');
    if (!btn) return;
    btn.closest('tr')?.remove();
    ensureAtLeastOneRow();
    updateTotals();
    scheduleSave();
  });

  // item autocomplete: fill price if known
  refs.itemsBody.addEventListener('change', (e) => {
    if (!e.target.matches('[data-field="description"]')) return;
    const found = findItemByDescription(e.target.value);
    if (!found) return;
    const tr = e.target.closest('tr');
    const priceInput = tr?.querySelector('[data-field="price"]');
    if (priceInput && !Number(priceInput.value)){
      priceInput.value = String(found.price ?? 0);
      updateTotals();
      scheduleSave();
    }
  });

  // generic fields
  const anyInputs = [
    refs.vatRate, refs.currency, refs.docNumber, refs.docDate,
    refs.emitterName, refs.emitterAddress, refs.emitterExtra, refs.emitterTel,
    refs.clientName, refs.clientAddress, refs.clientExtra, refs.clientIfu
  ];
  anyInputs.forEach(el => {
    el.addEventListener('input', () => {
      updateCurrencyDisplay();
      updateTotals();
      scheduleSave();
    });
  });

  // client autocomplete
  refs.clientName.setAttribute('list', 'clientDatalist');
  refs.clientName.addEventListener('change', () => {
    const c = findClientByName(refs.clientName.value);
    if (!c) return;
    refs.clientAddress.value = c.address || '';
    refs.clientExtra.value = c.extra || '';
    refs.clientIfu.value = c.ifu || '';
    scheduleSave();
  });

  // logo upload
  refs.logoUpload.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try{
      const dataUrl = await downscaleImageToDataURL(file, {max: 320, quality: 0.85});
      state.logoDataURL = dataUrl;
      refs.logoPreview.src = dataUrl;
      refs.logoPreview.style.display = 'block';
      refs.logoPlaceholder.style.display = 'none';
      scheduleSave();
      showToast('Logo importé.', 'success');
    } catch {
      showToast('Impossible de lire le logo.', 'error');
    }
  });

  // history
  refs.btnHistory.addEventListener('click', openHistory);
  refs.btnCloseHistory.addEventListener('click', closeHistory);
  refs.historyOverlay.addEventListener('click', (e) => {
    if (e.target === refs.historyOverlay) closeHistory();
  });
  refs.historySearch.addEventListener('input', renderHistory);

  // archive / new
  refs.btnArchive.addEventListener('click', () => {
    archiveCurrentDocument();
    scheduleSave();
  });
  refs.btnNew.addEventListener('click', newDocument);

  // export
  const exportCtx = () => ({
    state, refs, fmtMoney,
    clampNumber, computeSubtotal,
    ensurePdfRoom, getDataUrlMime,
    cleanSpaces, validateBeforeExport,
    showToast
  });

  refs.btnPdf.addEventListener('click', () => exportPDF(exportCtx()));
  refs.btnExcel.addEventListener('click', () => exportExcel(exportCtx()));

  // shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && refs.historyOverlay.classList.contains('open')) closeHistory();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
      e.preventDefault();
      archiveCurrentDocument();
    }
  });
}

/* ------- Init ------- */
function init(){
  refs.docDate.value = todayISO();
  renderClientDatalist(refs.clientDatalist);
  renderItemDatalist(refs.itemDatalist);

  loadDraft();
  ensureAtLeastOneRow();
  updateCurrencyDisplay();
  updateTotals();
  bindEvents();

  // Apply maintenance handoff (if any)
  applyHandoffIfAny();

  // Ensure numbering exists
  if (!refs.docNumber.value.trim()){
    const dateISO = refs.docDate.value || todayISO();
    refs.docNumber.value = nextId({ kind:'PF', prefix:'PF', dateISO });
    scheduleSave();
  }
}
init();
