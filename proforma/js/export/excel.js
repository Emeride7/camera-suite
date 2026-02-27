export function exportExcel(ctx){
  const {
    refs, clampNumber, computeSubtotal,
    validateBeforeExport, showToast
  } = ctx;

  if (!validateBeforeExport()) return;

  const wb = XLSX.utils.book_new();
  const curr = (refs.currency.value || 'CFA').trim() || 'CFA';
  const vat = clampNumber(refs.vatRate.value);

  const data = [
    [refs.docTitle.textContent],
    [],
    ['Numéro', refs.docNumber.value, '', 'Date', refs.docDate.value],
    [],
    ['ÉMETTEUR'],
    [refs.emitterName.value || 'Votre entreprise'],
    [refs.emitterAddress.value || ''],
    [refs.emitterExtra.value || ''],
    [refs.emitterTel.value || ''],
    [],
    ['CLIENT'],
    [refs.clientName.value || ''],
    [refs.clientAddress.value || ''],
    [refs.clientExtra.value || ''],
    ...(refs.clientIfu.value ? [['IFU', refs.clientIfu.value]] : []),
    [],
    ['Description', 'Quantité', `Prix unitaire HT (${curr})`, `Total HT (${curr})`]
  ];

  for (const tr of refs.itemsBody.rows){
    const desc = tr.querySelector('[data-field="description"]').value || '';
    const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
    const price = clampNumber(tr.querySelector('[data-field="price"]').value);
    data.push([desc, qty, price, qty*price]);
  }

  const subtotal = computeSubtotal();
  const tax = subtotal * vat / 100;
  const ttc = subtotal + tax;

  data.push([]);
  data.push(['Sous-total HT', '', '', subtotal]);
  if (vat > 0) data.push([`TVA (${vat}%)`, '', '', tax]);
  data.push(['Total TTC', '', '', ttc]);
  data.push([]);
  data.push(['Signature : _________________________________']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:44},{wch:12},{wch:22},{wch:22},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws, 'Document');

  XLSX.writeFile(wb, `${refs.docTitle.textContent}_${refs.docNumber.value}.xlsx`);
  showToast('Excel téléchargé.', 'success');
}
