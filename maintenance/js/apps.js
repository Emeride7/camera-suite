import { storage, todayISO } from '../../assets/js/shared/storage.js';
import { nextId } from '../../assets/js/shared/id.js';
import { setHandoff } from '../../assets/js/shared/handoff.js';
import { defaultMaintenanceData } from './defaults.js';

const STORE_KEY = 'suite.maintenance.data.v1';
const REPORT_KEY = 'suite.maintenance.report.v1';

const $ = (s, r=document) => r.querySelector(s);

const refs = {
  reportId: $('#reportId'),
  reportDate: $('#reportDate'),
  btnNewReport: $('#btnNewReport'),
  btnSendToProforma: $('#btnSendToProforma'),

  form: $('#cameraForm'),
  cameraId: $('#cameraId'),
  cameraName: $('#cameraName'),
  emplacement: $('#emplacement'),
  etat: $('#etat'),
  probleme: $('#probleme'),
  action: $('#action'),
  btnCancelEdit: $('#btnCancelEdit'),

  newEmplacement: $('#newEmplacement'),
  newProbleme: $('#newProbleme'),
  newAction: $('#newAction'),
  btnAddEmplacement: $('#btnAddEmplacement'),
  btnAddProbleme: $('#btnAddProbleme'),
  btnAddAction: $('#btnAddAction'),
  btnReset: $('#btnReset'),

  tbody: $('#camerasTbody'),
  total: $('#totalCameras'),
  totalBon: $('#totalBon'),
  totalPasBon: $('#totalPasBon'),

  toast: $('#toast')
};

const state = {
  data: storage.get(STORE_KEY, defaultMaintenanceData),
  report: storage.get(REPORT_KEY, null),
};

function toast(msg, type='info', ms=2200){
  refs.toast.textContent = msg;
  refs.toast.style.background = type === 'error'
    ? 'rgba(127,29,29,.98)'
    : (type === 'success' ? 'rgba(20,83,45,.98)' : 'rgba(30,60,114,.98)');
  refs.toast.classList.add('show');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => refs.toast.classList.remove('show'), ms);
}

function save(){
  storage.set(STORE_KEY, state.data);
}

function saveReport(){
  storage.set(REPORT_KEY, state.report);
}

function ensureReport(){
  if (!state.report){
    const dateISO = todayISO();
    state.report = {
      id: nextId({ kind:'RM', prefix:'RM', dateISO }),
      dateISO
    };
    saveReport();
  }
  refs.reportId.textContent = state.report.id;
  refs.reportDate.value = state.report.dateISO || todayISO();
}

function updateSelect(select, placeholder, values){
  select.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = placeholder;
  select.appendChild(opt0);

  for (const v of values){
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  }
}

function renderSelects(){
  updateSelect(refs.emplacement, 'Sélectionner un emplacement', state.data.emplacements);
  updateSelect(refs.probleme, 'Sélectionner un problème', state.data.problemes);
  updateSelect(refs.action, 'Sélectionner une action', state.data.actions);
}

function badge(etat){
  const span = document.createElement('span');
  span.className = 'badge ' + (etat === 'Bon' ? 'badge--ok' : 'badge--bad');
  span.textContent = etat;
  return span;
}

function renderTable(){
  refs.tbody.innerHTML = '';

  const cams = [...state.data.cameras].sort((a,b) => a.id - b.id);
  for (const cam of cams){
    const tr = document.createElement('tr');

    const tdName = document.createElement('td'); tdName.textContent = cam.name;
    const tdEmp = document.createElement('td'); tdEmp.textContent = cam.emplacement;
    const tdEtat = document.createElement('td'); tdEtat.appendChild(badge(cam.etat));
    const tdProb = document.createElement('td'); tdProb.textContent = cam.probleme || '-';
    const tdAct = document.createElement('td'); tdAct.textContent = cam.action || '-';

    const tdActions = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'rowActions';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'iconBtn iconBtn--edit';
    btnEdit.textContent = 'Éditer';
    btnEdit.dataset.action = 'edit';
    btnEdit.dataset.id = String(cam.id);

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'iconBtn iconBtn--del';
    btnDel.textContent = 'Suppr.';
    btnDel.dataset.action = 'delete';
    btnDel.dataset.id = String(cam.id);

    wrap.append(btnEdit, btnDel);
    tdActions.appendChild(wrap);

    tr.append(tdName, tdEmp, tdEtat, tdProb, tdAct, tdActions);
    refs.tbody.appendChild(tr);
  }

  // stats
  const total = state.data.cameras.length;
  const bon = state.data.cameras.filter(c => c.etat === 'Bon').length;
  refs.total.textContent = String(total);
  refs.totalBon.textContent = String(bon);
  refs.totalPasBon.textContent = String(total - bon);
}

function resetForm(){
  refs.form.reset();
  refs.cameraId.value = '';
  refs.btnCancelEdit.hidden = true;
}

function startEdit(id){
  const cam = state.data.cameras.find(c => c.id === id);
  if (!cam) return;
  refs.cameraId.value = String(cam.id);
  refs.cameraName.value = cam.name;
  refs.emplacement.value = cam.emplacement;
  refs.etat.value = cam.etat;
  refs.probleme.value = cam.probleme || '';
  refs.action.value = cam.action || '';
  refs.btnCancelEdit.hidden = false;
  refs.cameraName.focus();
}

function deleteCamera(id){
  if (!confirm('Supprimer cette caméra ?')) return;
  state.data.cameras = state.data.cameras.filter(c => c.id !== id);
  save();
  renderTable();
  toast('Caméra supprimée.', 'success');
}

function addUnique(list, value){
  const v = String(value || '').trim();
  if (!v) return false;
  if (list.includes(v)) return false;
  list.push(v);
  return true;
}

function newReport(){
  if (!confirm('Créer un nouveau rapport (nouvel ID) ?')) return;
  const dateISO = refs.reportDate.value || todayISO();
  state.report = { id: nextId({kind:'RM', prefix:'RM', dateISO}), dateISO };
  saveReport();
  ensureReport();
  toast('Nouveau rapport créé.', 'success');
}

function sendToProforma(){
  // Génère des lignes à partir des caméras "Pas Bon"
  const broken = state.data.cameras.filter(c => c.etat === 'Pas Bon');
  const items = broken.map(c => ({
    description: `Remplacement caméra — ${c.name} (${c.emplacement})`,
    qty: 1,
    price: 0
  }));

  if (items.length === 0){
    items.push({ description: 'Prestation maintenance (à préciser)', qty: 1, price: 0 });
  }

  setHandoff({
    from: 'maintenance',
    reportId: state.report.id,
    reportDateISO: refs.reportDate.value || todayISO(),
    items,
    note: 'Lignes pré-remplies depuis le rapport de maintenance.'
  });

  toast('Transfert préparé. Ouverture Pro Forma…', 'success', 1400);
  window.setTimeout(() => { window.location.href = '../proforma/'; }, 700);
}

function bindEvents(){
  refs.reportDate.addEventListener('change', () => {
    state.report.dateISO = refs.reportDate.value || todayISO();
    saveReport();
  });

  refs.btnNewReport.addEventListener('click', newReport);
  refs.btnSendToProforma.addEventListener('click', sendToProforma);

  refs.btnCancelEdit.addEventListener('click', () => resetForm());

  refs.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = refs.cameraId.value ? Number(refs.cameraId.value) : null;
    const payload = {
      name: refs.cameraName.value.trim(),
      emplacement: refs.emplacement.value,
      etat: refs.etat.value,
      probleme: refs.probleme.value || '',
      action: refs.action.value || ''
    };

    if (!payload.name || !payload.emplacement){
      toast('Nom + emplacement requis.', 'error');
      return;
    }

    if (id){
      const idx = state.data.cameras.findIndex(c => c.id === id);
      if (idx >= 0) state.data.cameras[idx] = { ...state.data.cameras[idx], ...payload };
      toast('Caméra mise à jour.', 'success');
    } else {
      const newId = Math.max(0, ...state.data.cameras.map(c => c.id)) + 1;
      state.data.cameras.push({ id: newId, ...payload });
      toast('Caméra ajoutée.', 'success');
    }

    save();
    renderTable();
    resetForm();
  });

  refs.tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'edit') startEdit(id);
    if (btn.dataset.action === 'delete') deleteCamera(id);
  });

  refs.btnAddEmplacement.addEventListener('click', () => {
    if (addUnique(state.data.emplacements, refs.newEmplacement.value)){
      refs.newEmplacement.value = '';
      renderSelects(); save(); toast('Emplacement ajouté.', 'success');
    }
  });
  refs.btnAddProbleme.addEventListener('click', () => {
    if (addUnique(state.data.problemes, refs.newProbleme.value)){
      refs.newProbleme.value = '';
      renderSelects(); save(); toast('Problème ajouté.', 'success');
    }
  });
  refs.btnAddAction.addEventListener('click', () => {
    if (addUnique(state.data.actions, refs.newAction.value)){
      refs.newAction.value = '';
      renderSelects(); save(); toast('Action ajoutée.', 'success');
    }
  });

  refs.btnReset.addEventListener('click', () => {
    if (!confirm('Réinitialiser toutes les données Maintenance ?')) return;
    state.data = structuredClone(defaultMaintenanceData);
    save();
    renderSelects();
    renderTable();
    toast('Données réinitialisées.', 'success');
  });
}

function init(){
  ensureReport();
  renderSelects();
  renderTable();
  bindEvents();
}
init();
