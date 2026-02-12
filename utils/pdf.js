const PDFDocument = require('pdfkit');

/* ================= helpers ================= */

const money = (n) => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
};

const fmtDateTime = (d = new Date()) => {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return d.toISOString();
  }
};

const safe = (v) => (v === null || v === undefined ? '' : String(v));
const oneLine = (v) => safe(v).replace(/\s*\r?\n\s*/g, ' ').trim();

function truncate(doc, text, maxWidth) {
  const s = oneLine(text);
  if (!s) return '';
  if (doc.widthOfString(s) <= maxWidth) return s;

  const ell = '…';
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = s.slice(0, mid) + ell;
    if (doc.widthOfString(candidate) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + ell;
}

/* ================= layout ================= */

function drawHeader(doc, { title, subtitle }) {
  const M = doc.page.margins.left;
  const pageW = doc.page.width;
  const contentW = pageW - M - doc.page.margins.right;

  doc.save();
  doc.rect(0, 0, pageW, 72).fill('#0B4F6C');

  doc.fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(title || 'Resumen', M, 18, { width: contentW, lineBreak: false });

  doc.fillColor('#EAF2F6')
    .font('Helvetica')
    .fontSize(10)
    .text(subtitle || '', M, 44, { width: contentW, lineBreak: false });

  doc.fillColor('#D3E6EF')
    .fontSize(9)
    .text(`Generado: ${fmtDateTime(new Date())}`, M, 58, {
      width: contentW,
      lineBreak: false
    });

  doc.restore();
  doc.y = 92;
}

function drawKpis(doc, kpis) {
  if (!kpis) return;

  const M = doc.page.margins.left;
  const pageW = doc.page.width;
  const contentW = pageW - M - doc.page.margins.right;

  const cards = [
    { label: 'Ventas', value: safe(kpis.ventas ?? '-') },
    { label: 'Total', value: money(kpis.total ?? 0) },
    { label: 'Efectivo', value: money(kpis.efectivo ?? 0) },
    { label: 'Transferencia', value: money(kpis.transferencia ?? 0) },
    { label: 'A cobrar', value: money(kpis.a_cobrar ?? 0) }
  ];

  const gap = 10;
  const cardH = 46;
  const cols = 3;
  const cardW = (contentW - gap * (cols - 1)) / cols;

  const y0 = doc.y;

  doc.save();
  cards.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = M + col * (cardW + gap);
    const y = y0 + row * (cardH + gap);

    doc.roundedRect(x, y, cardW, cardH, 8)
      .fill('#F3F6F8')
      .stroke('#D9E2E7');

    doc.fillColor('#51606A').fontSize(9)
      .text(c.label, x + 10, y + 8, { width: cardW - 20, lineBreak: false });

    doc.fillColor('#0B4F6C').font('Helvetica-Bold').fontSize(14)
      .text(c.value, x + 10, y + 22, { width: cardW - 20, lineBreak: false });
  });
  doc.restore();

  doc.y = y0 + Math.ceil(cards.length / cols) * (cardH + gap);
  doc.moveDown(0.4);
}

function drawFooter(doc, pageNum) {
  const M = doc.page.margins.left;
  const pageH = doc.page.height;
  const contentW = doc.page.width - M - doc.page.margins.right;

  doc.save();
  doc.strokeColor('#E1E7EB')
    .lineWidth(1)
    .moveTo(M, pageH - 48)
    .lineTo(M + contentW, pageH - 48)
    .stroke();

  doc.fillColor('#7A8790').fontSize(8)
    .text('CanteraVenta • Reporte automático', M, pageH - 40, {
      width: contentW,
      lineBreak: false
    });

  doc.text(`Página ${pageNum}`, M, pageH - 30, {
    width: contentW,
    align: 'right',
    lineBreak: false
  });

  doc.restore();
}

function drawTableHeader(doc, x0, y0, cols, rowH) {
  doc.save();
  doc.rect(x0, y0, cols.totalW, rowH).fill('#0B4F6C');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);

  cols.items.forEach((c) => {
    doc.text(c.label, c.x + 6, y0 + 6, {
      width: c.w - 12,
      align: c.align || 'left',
      lineBreak: false
    });
  });

  doc.restore();
}

/* ================= main ================= */

function streamResumenPDF(res, { title, subtitle, kpis, rows }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  doc.pipe(res);

  const M = doc.page.margins.left;

  const reservedBottom = 60; // footer + numeración
  const maxY = () => doc.page.height - doc.page.margins.bottom - reservedBottom;

  const cols = {
    items: [
      { key: 'date', label: 'Fecha', w: 78 },
      { key: 'time', label: 'Hora', w: 58 },
      { key: 'client', label: 'Cliente', w: 100 },
      { key: 'product', label: 'Producto', w: 84 },
      { key: 'qty', label: 'Cant.', w: 30, align: 'right' },
      { key: 'pay', label: 'Pago', w: 50 },
      { key: 'total', label: 'Total', w: 60, align: 'right' },
      { key: 'debt', label: 'Deuda', w: 60, align: 'right' }
    ],
    totalW: 0
  };

  let x = M;
  cols.items.forEach((c) => {
    c.x = x;
    x += c.w;
    cols.totalW += c.w;
  });

  const headerH = 24;
  const rowH = 18;

  let pageNum = 1;

  const newPage = (isCont) => {
    drawFooter(doc, pageNum);
    doc.addPage();
    pageNum++;

    drawHeader(doc, { title, subtitle });

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827')
      .text(isCont ? 'Detalle (cont.)' : 'Detalle', M, doc.y + 8);

    doc.moveDown(1.2);

    let y = doc.y;
    drawTableHeader(doc, M, y, cols, headerH);
    return y + headerH;
  };

  // -------- primera página --------
  drawHeader(doc, { title, subtitle });
  drawKpis(doc, kpis);

  const list = rows || [];

  if (list.length === 0) {
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(12)
      .text('Sin movimientos para el período seleccionado.', M, doc.y);

    drawFooter(doc, pageNum);
    doc.end();
    return;
  }

  doc.font('Helvetica-Bold').fontSize(11)
    .text('Detalle', M, doc.y + 8);

  doc.moveDown(1.2);

  let y = doc.y;
  drawTableHeader(doc, M, y, cols, headerH);
  y += headerH;

  doc.font('Helvetica').fontSize(9);

  for (let i = 0; i < list.length; i++) {
    if (y + rowH > maxY()) {
      y = newPage(true);
    }

    const r = list[i];
    const isAlt = i % 2 === 1;

    doc.rect(M, y, cols.totalW, rowH)
      .fill(isAlt ? '#FAFBFC' : '#FFFFFF')
      .stroke('#EEF2F4');

    const cells = {
      date: oneLine(r.dayISO || r.fecha || ''),
      time: oneLine(r.time || ''),
      client: oneLine(r.client_name || ''),
      product: oneLine(r.product_name || ''),
      qty: r.qty ?? '',
      pay: oneLine(r.payment_method || ''),
      total: money(r.final_price ?? r.total ?? 0),
      debt: Number(r.debt) > 0 ? money(r.debt) : ''
    };

    cols.items.forEach((c) => {
      const text = truncate(doc, cells[c.key], c.w - 12);
      doc.fillColor('#111827').text(text, c.x + 6, y + 4, {
        width: c.w - 12,
        align: c.align || 'left',
        lineBreak: false
      });
    });

    y += rowH;
  }

  drawFooter(doc, pageNum);
  doc.end();
}

module.exports = { streamResumenPDF, money };
