// stores/memoryStore.js
// ==========================================================
// Store 100% en memoria (para desarrollo local sin Postgres).
// IMPORTANTE: implementa la MISMA interfaz que dbStore.js
// para que TODAS las rutas/controllers funcionen igual.
// ==========================================================

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ===== DATA EN MEMORIA =====
let clients = [];
let products = [];
let sales = [];
let payments = [];

let nextClientId = 1;
let nextProductId = 1;
let nextSaleId = 1;
let nextPaymentId = 1;

// ===== AUTH =====
async function findUserByUsername(username) {
  const u = String(username || '').trim();
  // Usuario por defecto para pruebas locales
  if (u === 'admin') {
    return { id: 1, username: 'admin', password: 'admin' };
  }
  return null;
}

// ===== CLIENTES =====
async function listClients() {
  return [...clients].filter(c => c.activo !== false);
}

async function getClient(id) {
  return clients.find(c => c.id === Number(id)) || null;
}

async function createClient(payload) {
  const client = {
    id: nextClientId++,
    full_name: String(payload?.full_name || '').trim() || 'Sin nombre',
    phone: String(payload?.phone || '').trim(),
    activo: true,
  };
  clients.push(client);
  return client;
}

async function updateClient(id, payload) {
  const c = await getClient(id);
  if (!c) return null;
  if (payload?.full_name !== undefined) c.full_name = String(payload.full_name).trim();
  if (payload?.phone !== undefined) c.phone = String(payload.phone).trim();
  return c;
}

async function deleteClient(id) {
  const c = await getClient(id);
  if (!c) return false;
  c.activo = false;
  return true;
}

// ===== PRODUCTOS / STOCK =====
async function listProducts() {
  return [...products];
}

async function getProduct(id) {
  return products.find(p => p.id === Number(id)) || null;
}

async function createProduct(payload) {
  const product = {
    id: nextProductId++,
    name: String(payload?.name || '').trim() || 'Producto',
    price: toNum(payload?.price),
    stock_qty: toNum(payload?.stock_qty),
    active: payload?.active !== undefined ? !!payload.active : true,
  };
  products.push(product);
  return product;
}

async function updateProduct(id, payload) {
  const p = await getProduct(id);
  if (!p) return null;
  if (payload?.name !== undefined) p.name = String(payload.name).trim();
  if (payload?.price !== undefined) p.price = toNum(payload.price);
  if (payload?.stock_qty !== undefined) p.stock_qty = toNum(payload.stock_qty);
  if (payload?.active !== undefined) p.active = !!payload.active;
  return p;
}

async function deleteProduct(id) {
  const p = await getProduct(id);
  if (!p) return false;
  // delete lógico
  p.active = false;
  return true;
}

// ===== VENTAS =====
async function createSale(payload) {
  const sale = {
    id: nextSaleId++,
    sale_type: String(payload?.sale_type || 'CANTERA').toUpperCase(),
    sale_datetime: payload?.sale_datetime ? new Date(payload.sale_datetime).toISOString() : new Date().toISOString(),
    client_id: payload?.client_id ? Number(payload.client_id) : null,
    product_id: payload?.product_id ? Number(payload.product_id) : null,
    product_price: toNum(payload?.product_price),
    qty: Math.max(1, toNum(payload?.qty || 1)),
    freight_price: toNum(payload?.freight_price),
    final_price: toNum(payload?.final_price),
    payment_method: String(payload?.payment_method || 'efectivo').toLowerCase(),
    paid_amount: toNum(payload?.paid_amount),
  };
  sales.push(sale);

  // Ajuste rápido de stock (si existe producto)
  if (sale.product_id) {
    const p = await getProduct(sale.product_id);
    if (p) p.stock_qty = Math.max(0, toNum(p.stock_qty) - sale.qty);
  }

  return sale;
}

async function listSales() {
  return [...sales];
}

async function getSale(id) {
  return sales.find(s => s.id === Number(id)) || null;
}

async function listSalesByTypeBetween(type, fromISO, toISO) {
  const t = String(type || '').toUpperCase();
  const from = String(fromISO);
  const to = String(toISO);
  return sales.filter(s => {
    if (t && String(s.sale_type).toUpperCase() !== t) return false;
    const day = new Date(s.sale_datetime).toISOString().slice(0, 10);
    return day >= from && day <= to;
  });
}

async function listSalesByTypeOnDay(type, dayISO, clientId) {
  const t = String(type || '').toUpperCase();
  const d = String(dayISO);
  const cid = clientId ? String(clientId) : '';
  return sales.filter(s => {
    if (t && String(s.sale_type).toUpperCase() !== t) return false;
    const day = new Date(s.sale_datetime).toISOString().slice(0, 10);
    if (day !== d) return false;
    if (cid && String(s.client_id) !== cid) return false;
    return true;
  });
}

// ===== PAGOS =====
async function listPayments() {
  return [...payments].sort((a, b) => new Date(a.paid_datetime) - new Date(b.paid_datetime));
}

async function addPayment(payload) {
  const sale_id = Number(payload?.sale_id);
  const amount = toNum(payload?.amount);
  const method = String(payload?.method || 'efectivo').toLowerCase();

  const sale = await getSale(sale_id);
  if (!sale) {
    // En dbStore esto explotaría con FK; acá devolvemos null para que el controller maneje.
    return null;
  }

  // cap: no pagar de más
  const total = toNum(sale.final_price);
  const pagado = toNum(sale.paid_amount);
  const toPay = Math.max(0, Math.min(amount, total - pagado));

  const payment = {
    id: nextPaymentId++,
    sale_id,
    amount: toPay,
    method,
    paid_datetime: new Date().toISOString(),
  };
  payments.push(payment);
  sale.paid_amount = pagado + toPay;
  return payment;
}

// ==========================================================
// Compatibilidad con nombres viejos (por si quedó algo suelto)
// ==========================================================
async function addClient(data) { return createClient(data); }
async function addSale(data) { return createSale(data); }

async function listSalesAll() { return listSales(); }

module.exports = {
  // auth
  findUserByUsername,

  // clientes
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,

  // productos
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,

  // ventas
  createSale,
  listSales,
  listSalesAll,
  getSale,
  listSalesByTypeBetween,
  listSalesByTypeOnDay,

  // pagos
  listPayments,
  addPayment,

  // aliases
  addClient,
  addSale,
};
