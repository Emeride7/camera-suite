export function exportPDF(ctx){
  const {
    state, refs, fmtMoney,
    clampNumber, computeSubtotal,
    ensurePdfRoom, getDataUrlMime,
    cleanSpaces, validateBeforeExport
  } = ctx;

  if (!validateBeforeExport()) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'p', unit:'mm', format:'a4' });

  const pageW = 210;
  const margin = 15;

  // Header band
  doc.setFillColor(30, 60, 114);
  doc.rect(0, 0, pageW, 45, 'F');

  let logoEndX = margin;
  if (state.logoDataURL){
    try{
      const mime = getDataUrlMime(state.logoDataURL);
      const type = (mime === 'image/png') ? 'PNG' : 'JPEG';
      doc.addImage(state.logoDataURL, type, margin, 8, 28, 28, undefined, 'FAST');
      logoEndX = margin + 32;
    } catch {}
  }

  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(13);
  doc.text(refs.emitterName.value || 'Votre entreprise', logoEndX, 16);

  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.text(refs.emitterAddress.value || '', logoEndX, 22);
  doc.text(refs.emitterExtra.value || '', logoEndX, 27);
  doc.text(refs.emitterTel.value || '', logoEndX, 32);

  doc.setFont('helvetica','bold');
  doc.setFontSize(20);
  const title = refs.docTitle.textContent;
  doc.text(title, pageW - margin, 18, { align:'right' });

  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.text(`N° ${refs.docNumber.value}`, pageW - margin, 28, { align:'right' });
  doc.text(`Date : ${refs.docDate.value}`, pageW - margin, 34, { align:'right' });

  // Client block
  let y = 48;
  doc.setFillColor(232,238,255);
  doc.roundedRect(margin, y, pageW - margin*2, 34, 3, 3, 'F');
  doc.setDrawColor(42,82,152);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin, y + 34);

  doc.setFont('helvetica','bold');
  doc.setFontSize(7);
  doc.setTextColor(42,82,152);
  doc.text(state.mode === 'facture' ? 'FACTURÉ À' : 'CLIENT', margin + 4, y + 6);

  doc.setTextColor(10,10,40);
  doc.setFontSize(9.5);
  doc.text(refs.clientName.value || '', margin + 4, y + 13);

  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.text(refs.clientAddress.value || '', margin + 4, y + 19);
  doc.text(refs.clientExtra.value || '', margin + 4, y + 25);
  if (refs.clientIfu.value) doc.text(`IFU : ${refs.clientIfu.value}`, margin + 4, y + 31);

  y += 42;

  const tableData = [];
  for (const tr of refs.itemsBody.rows){
    const desc = tr.querySelector('[data-field="description"]').value || '';
    const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
    const price = clampNumber(tr.querySelector('[data-field="price"]').value);
    const tot = qty * price;

    tableData.push([
      desc,
      cleanSpaces(String(qty)),
      cleanSpaces(fmtMoney.format(price)),
      cleanSpaces(fmtMoney.format(tot))
    ]);
  }

  doc.autoTable({
    head: [['Description','Qté','Prix unitaire HT','Total HT']],
    body: tableData,
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: [30,60,114], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 38 }
    },
    alternateRowStyles: { fillColor: [248,250,255] }
  });

  let finalY = (doc.lastAutoTable?.finalY || y) + 8;
  finalY = ensurePdfRoom(doc, finalY + 40);

  const curr = (refs.currency.value || 'CFA').trim() || 'CFA';
  const subtotal = cleanSpaces(document.getElementById('subtotal').textContent);
  const tax = cleanSpaces(document.getElementById('totalTax').textContent);
  const total = cleanSpaces(document.getElementById('grandTotal').textContent);
  const vat = clampNumber(refs.vatRate.value);

  const boxW = 85;
  const boxH = (vat > 0) ? 30 : 22;
  const boxX = pageW - margin - boxW;

  doc.setFillColor(232,238,255);
  doc.roundedRect(boxX, finalY, boxW, boxH, 3, 3, 'F');

  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90,90,120);

  doc.text('Sous-total HT', boxX + 4, finalY + 8);
  if (vat > 0) doc.text(`TVA (${vat}%)`, boxX + 4, finalY + 15);

  doc.setFont('helvetica','bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30,60,114);
  doc.text('Total TTC', boxX + 4, finalY + (vat>0 ? 24 : 16));

  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(10,10,40);
  doc.text(`${subtotal} ${curr}`, pageW - margin - 2, finalY + 8, { align:'right' });
  if (vat > 0) doc.text(`${tax} ${curr}`, pageW - margin - 2, finalY + 15, { align:'right' });

  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.setTextColor(30,60,114);
  doc.text(`${total} ${curr}`, pageW - margin - 2, finalY + (vat>0 ? 24 : 16), { align:'right' });

  // Signature
  let sigY = finalY + boxH + 18;
  sigY = ensurePdfRoom(doc, sigY + 20);
  doc.setDrawColor(42,82,152);
  doc.setLineWidth(0.5);
  doc.line(margin, sigY, margin + 60, sigY);
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90,90,120);
  doc.text('Signature', margin, sigY + 5);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(180,180,200);
  doc.text(refs.emitterName.value || 'Votre entreprise', pageW/2, 295, { align:'center' });

  doc.save(`${title}_${refs.docNumber.value}.pdf`);
}
