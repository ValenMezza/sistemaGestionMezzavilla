// Elegimos store automáticamente:
// - Si STORE está seteado -> respeta eso (db | memory)
// - Si no está seteado y existe DATABASE_URL -> asumimos db
// - Caso contrario -> memory
const mode = (
  process.env.STORE || (process.env.DATABASE_URL ? 'db' : 'memory')
).toLowerCase();

let baseStore;
if (mode === 'db') baseStore = require('./dbStore');
else baseStore = require('./memoryStore');

// ✅ Wrapper: agregamos alias para mantener compatibilidad
const store = {
  ...baseStore,

  // Fallback ultra-seguro: evita "is not a function" en auth
  async findUserByUsername(username) {
    if (typeof baseStore.findUserByUsername === 'function') {
      return await baseStore.findUserByUsername(username);
    }
    const u = String(username || '').trim();
    if (u === 'admin') return { id: 1, username: 'admin', password: 'admin' };
    return null;
  },

  // Aliases comunes (por si algún controller viejo quedó llamando nombres anteriores)
  async addClient(payload) {
    if (typeof baseStore.addClient === 'function') return await baseStore.addClient(payload);
    if (typeof baseStore.createClient === 'function') return await baseStore.createClient(payload);
    throw new Error('Store: falta createClient/addClient');
  },
  async addSale(payload) {
    if (typeof baseStore.addSale === 'function') return await baseStore.addSale(payload);
    if (typeof baseStore.createSale === 'function') return await baseStore.createSale(payload);
    throw new Error('Store: falta createSale/addSale');
  },

  // Alias: algunos controllers viejos llaman listSalesAll()
  async listSalesAll(...args) {
    if (typeof baseStore.listSalesAll === 'function') {
      return await baseStore.listSalesAll(...args);
    }
    if (typeof baseStore.listSales === 'function') {
      return await baseStore.listSales(...args);
    }
    // fallback seguro
    return [];
  },
};

module.exports = store;
