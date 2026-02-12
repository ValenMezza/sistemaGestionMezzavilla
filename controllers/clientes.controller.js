const store = require('../stores/store');
const { weeksForMonth } = require('../utils/dates');
const { streamResumenPDF } = require('../utils/pdf');

/* LISTADO */
exports.list = async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const conDeuda = req.query.conDeuda === 'true' || req.query.conDeuda === 'on';

  const clients = await store.listClients();
  const sales = await store.listSales();

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const debtByClient = new Map();
  sales.forEach((s) => {
    if (!s.client_id) return;
    const debt = Math.max(0, toNum(s.final_price) - toNum(s.paid_amount));
    if (!debt) return;
    debtByClient.set(s.client_id, (debtByClient.get(s.client_id) || 0) + debt);
  });

  let rows = clients.map((c) => ({
    ...c,
    debt: debtByClient.get(c.id) || 0
  }));

  if (q) {
    rows = rows.filter((c) =>
      String(c.full_name || '').toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q)
    );
  }

  if (conDeuda) rows = rows.filter((c) => c.debt > 0);

  rows.sort((a, b) => (b.debt || 0) - (a.debt || 0));

  res.render('clientes/index', { clients: rows, q, conDeuda });
};


/* FORM NUEVO */
exports.viewCreate = (req, res) => {
  res.render('clientes/form', {
    title: 'Nuevo cliente',
    mode: 'create',
    client: { full_name: '', phone: '' },
    error: null
  });
};

/* CREAR */
exports.create = async (req, res) => {
  const { full_name, phone } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).render('clientes/form', {
      title: 'Nuevo cliente',
      mode: 'create',
      client: { full_name: full_name || '', phone: phone || '' },
      error: 'El nombre es obligatorio'
    });
  }

  await store.createClient({
    full_name: full_name.trim(),
    phone: phone ? phone.trim() : ''
  });

  res.redirect('/clientes');
};

/* FORM EDITAR */
exports.viewEdit = async (req, res) => {
  const client = await store.getClient(req.params.id);

  if (!client) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Cliente no encontrado' }
    });
  }

  res.render('clientes/form', {
    title: 'Editar cliente',
    mode: 'edit',
    client,
    error: null
  });
};

/* ACTUALIZAR */
exports.update = async (req, res) => {
  const { full_name, phone } = req.body;

  // buscamos el cliente para poder re-renderizar bien si hay error
  const client = await store.getClient(req.params.id);

  if (!client) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Cliente no encontrado' }
    });
  }

  if (!full_name || !full_name.trim()) {
    return res.status(400).render('clientes/form', {
      title: 'Editar cliente',
      mode: 'edit',
      client: { ...client, full_name: full_name || '', phone: phone || '' },
      error: 'El nombre es obligatorio'
    });
  }

  await store.updateClient(req.params.id, {
    full_name: full_name.trim(),
    phone: phone ? phone.trim() : ''
  });

  res.redirect('/clientes');
};

/* ELIMINAR */
exports.remove = async (req, res) => {
  await store.deleteClient(req.params.id);
  res.redirect('/clientes');
};


/* =========================
   PDF por cliente (sin BD)
========================= */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

exports.pdfMensualCliente = async (req, res) => {
  const clientId = Number(req.params.id);
  const client = await store.getClient(clientId);
  if (!client) return res.redirect('/clientes');

  const now = new Date();
  const year = Number(req.query.year || now.getFullYear());
  const month = Number(req.query.month || (now.getMonth() + 1));

  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  let sales = await store.listSales();
  sales = sales.filter(s => String(s.client_id) === String(clientId));
  sales = sales.filter(s => {
    const d = new Date(s.sale_datetime).toISOString().slice(0,10);
    return d >= from && d <= to;
  });

  const rows = await Promise.all(sales.map(async (s) => {
    const p = s.product_id ? await store.getProduct(s.product_id) : null;
    return {
      ...s,
      client_name: client.full_name,
      product_name: p ? p.name : 'Producto',
      dayISO: new Date(s.sale_datetime).toISOString().slice(0, 10),
      time: new Date(s.sale_datetime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      debt: Math.max(0, toNum(s.final_price) - toNum(s.paid_amount))
    };
  }));

  const kpis = {
    ventas: rows.length,
    total: rows.reduce((a, r) => a + toNum(r.final_price), 0),
    efectivo: rows.filter(r => r.payment_method === 'efectivo').reduce((a, r) => a + toNum(r.final_price), 0),
    transferencia: rows.filter(r => r.payment_method === 'transferencia').reduce((a, r) => a + toNum(r.final_price), 0),
    a_cobrar: rows.filter(r => ['fiado','vales'].includes(r.payment_method)).reduce((a, r) => a + Math.max(0, toNum(r.final_price)-toNum(r.paid_amount)), 0)
  };

  const subtitle = `Cliente: ${client.full_name} | Mes: ${String(month).padStart(2,'0')}/${year} (${from} al ${to})`;
  return streamResumenPDF(res, { title: 'Cliente - Resumen mensual', subtitle, kpis, rows });
};

exports.pdfSemanalCliente = async (req, res) => {
  const clientId = Number(req.params.id);
  const client = await store.getClient(clientId);
  if (!client) return res.redirect('/clientes');

  const now = new Date();
  const year = Number(req.query.year || now.getFullYear());
  const month = Number(req.query.month || (now.getMonth() + 1));

  // buscamos la semana actual dentro del mes seleccionado
  const weeks = weeksForMonth(year, month);
  const todayISO = now.toISOString().slice(0,10);
  let currentWeek = weeks.find(w => todayISO >= w.weekStart && todayISO <= w.weekEnd);
  if (!currentWeek) currentWeek = weeks[0];

  const weekStart = req.query.weekStart || currentWeek?.weekStart;
  const weekObj = weeks.find(w => w.weekStart === weekStart) || currentWeek;
  const weekEnd = weekObj?.weekEnd;

  let sales = await store.listSales();
  sales = sales.filter(s => String(s.client_id) === String(clientId));
  sales = sales.filter(s => {
    const d = new Date(s.sale_datetime).toISOString().slice(0,10);
    return d >= weekStart && d <= weekEnd;
  });

  const rows = await Promise.all(sales.map(async (s) => {
    const p = s.product_id ? await store.getProduct(s.product_id) : null;
    return {
      ...s,
      client_name: client.full_name,
      product_name: p ? p.name : 'Producto',
      dayISO: new Date(s.sale_datetime).toISOString().slice(0, 10),
      time: new Date(s.sale_datetime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      debt: Math.max(0, toNum(s.final_price) - toNum(s.paid_amount))
    };
  }));

  const kpis = {
    ventas: rows.length,
    total: rows.reduce((a, r) => a + toNum(r.final_price), 0),
    efectivo: rows.filter(r => r.payment_method === 'efectivo').reduce((a, r) => a + toNum(r.final_price), 0),
    transferencia: rows.filter(r => r.payment_method === 'transferencia').reduce((a, r) => a + toNum(r.final_price), 0),
    a_cobrar: rows.filter(r => ['fiado','vales'].includes(r.payment_method)).reduce((a, r) => a + Math.max(0, toNum(r.final_price)-toNum(r.paid_amount)), 0)
  };

  const subtitle = `Cliente: ${client.full_name} | Semana: ${weekStart} al ${weekEnd}`;
  return streamResumenPDF(res, { title: 'Cliente - Resumen semanal', subtitle, kpis, rows });
};


/* SALDAR DEUDA (registrar pago desde módulo clientes) */
exports.registrarPagoCliente = async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const amountIn = Number(req.body.amount || req.body.monto || 0);
    const method = (req.body.method || req.body.medioPago || req.body.payment_method || 'efectivo').toUpperCase();
    if (!Number.isFinite(amountIn) || amountIn <= 0) {
      return res.status(400).send('Monto inválido');
    }

    const clients = await store.listClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return res.status(404).send('Cliente no encontrado');

    const sales = await store.listSales();
    // Deuda por venta = final_price - paid_amount
    const debtSales = sales
      .filter(s => Number(s.client_id) === clientId)
      .map(s => ({
        sale: s,
        debt: Math.max(0, Number(s.final_price || 0) - Number(s.paid_amount || 0))
      }))
      .filter(x => x.debt > 0)
      .sort((a,b) => new Date(a.sale.sale_datetime) - new Date(b.sale.sale_datetime));

    let remaining = amountIn;
    for (const x of debtSales) {
      if (remaining <= 0) break;
      const pay = Math.min(x.debt, remaining);
      await store.addPayment({ sale_id: x.sale.id, amount: pay, method });
      remaining = Number((remaining - pay).toFixed(2));
    }

    // Si sobra, lo ignoramos (no generamos saldo a favor en modo sin DB)
    return res.redirect(req.get('referer') || '/clientes');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Error registrando pago');
  }
};
