
// const store = require('../stores/store');
// console.log("STORE KEYS:", Object.keys(store));

// const toNum = (v) => {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// };

// exports.viewHome = async (req, res) => {
//   // Dashboard: clientes con deuda y últimos pagos (sin BD)
//   const clients = await store.listClients();
//   const sales = await store.listSalesAll();
//   const payments = await store.listPayments();

//   const debtByClient = new Map();
//   sales.forEach((s) => {
//     if (!s.client_id) return;
//     const debt = Math.max(0, toNum(s.final_price) - toNum(s.paid_amount));
//     if (!debt) return;
//     debtByClient.set(s.client_id, (debtByClient.get(s.client_id) || 0) + debt);
//   });

//   const topDebts = clients
//     .map((c) => ({ ...c, debt: debtByClient.get(c.id) || 0 }))
//     .filter((c) => c.debt > 0)
//     .sort((a, b) => b.debt - a.debt)
//     .slice(0, 8);

//   const recentPayments = payments
//     .slice()
//     .sort((a, b) => new Date(b.paid_datetime) - new Date(a.paid_datetime))
//     .slice(0, 10);

//   // Enriquecer pagos con cliente
//   const recentPaymentsRich = await Promise.all(recentPayments.map(async (p) => {
//     const sale = await store.getSale(p.sale_id);
//     const client = sale?.client_id ? await store.getClient(sale.client_id) : null;
//     return {
//       ...p,
//       client_name: client ? client.full_name : 'Sin cliente',
//       sale_type: sale ? sale.sale_type : '-'
//     };
//   }));

//   res.render('home', { topDebts, recentPayments: recentPaymentsRich });
// };

const store = require('../stores/store');
console.log("STORE KEYS:", Object.keys(store));

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

exports.viewHome = async (req, res) => {
  try {
    // Dashboard
    const clients = await store.listClients();
    const sales = await store.listSales();   // ✅ CAMBIO ACÁ
    const payments = await store.listPayments();

    const debtByClient = new Map();
    sales.forEach((s) => {
      if (!s.client_id) return;
      const debt = Math.max(0, toNum(s.final_price) - toNum(s.paid_amount));
      if (!debt) return;
      debtByClient.set(s.client_id, (debtByClient.get(s.client_id) || 0) + debt);
    });

    const topDebts = clients
      .map((c) => ({ ...c, debt: debtByClient.get(c.id) || 0 }))
      .filter((c) => c.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 8);

    const recentPayments = payments
      .slice()
      .sort((a, b) => new Date(b.paid_datetime) - new Date(a.paid_datetime))
      .slice(0, 10);

    // Enriquecer pagos con cliente
    const recentPaymentsRich = await Promise.all(
      recentPayments.map(async (p) => {
        const sale = await store.getSale(p.sale_id);
        const client = sale?.client_id ? await store.getClient(sale.client_id) : null;
        return {
          ...p,
          client_name: client ? (client.full_name || client.nombre) : 'Sin cliente',
          sale_type: sale ? (sale.sale_type || sale.tipo_venta) : '-',
        };
      })
    );

    return res.render('home', { topDebts, recentPayments: recentPaymentsRich });
  } catch (err) {
    console.error("ERROR viewHome:", err);
    return res.status(500).send("Error interno en Home (ver consola).");
  }
};
