const db = require("../db");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

module.exports = {
  // =========================
  // AUTH
  // =========================
  async findUserByUsername(username) {
    const { rows } = await db.query(
      `SELECT
         id,
         usuario AS username,
         clave  AS password
       FROM public.usuarios
       WHERE usuario = $1 AND activo = TRUE
       LIMIT 1`,
      [String(username)]
    );
    return rows[0] || null;
  },

  // =========================
  // CLIENTES
  // (Tu app usa full_name/phone. La BD guarda nombre/telefono)
  // =========================
  async listClients() {
    const { rows } = await db.query(
      `SELECT
         id,
         nombre AS full_name,
         telefono AS phone
       FROM public.clientes
       WHERE activo = TRUE
       ORDER BY nombre ASC`
    );
    return rows;
  },

  async getClient(id) {
    const { rows } = await db.query(
      `SELECT
         id,
         nombre AS full_name,
         telefono AS phone
       FROM public.clientes
       WHERE id = $1`,
      [Number(id)]
    );
    return rows[0] || null;
  },

  async createClient(payload) {
    const full_name = (payload.full_name || "").trim() || "Sin nombre";
    const phone = (payload.phone || "").trim();

    const { rows } = await db.query(
      `INSERT INTO public.clientes (nombre, telefono)
       VALUES ($1, $2)
       RETURNING id, nombre AS full_name, telefono AS phone`,
      [full_name, phone]
    );
    return rows[0];
  },

  async updateClient(id, payload) {
    const current = await this.getClient(id);
    if (!current) return null;

    const full_name =
      payload.full_name !== undefined ? String(payload.full_name).trim() : current.full_name;
    const phone =
      payload.phone !== undefined ? String(payload.phone).trim() : current.phone;

    const { rows } = await db.query(
      `UPDATE public.clientes
       SET nombre = $1,
           telefono = $2,
           actualizado_en = NOW()
       WHERE id = $3
       RETURNING id, nombre AS full_name, telefono AS phone`,
      [full_name, phone, Number(id)]
    );
    return rows[0] || null;
  },

  async deleteClient(id) {
    // delete lógico
    const r = await db.query(
      `UPDATE public.clientes
       SET activo = FALSE, actualizado_en = NOW()
       WHERE id = $1`,
      [Number(id)]
    );
    return r.rowCount > 0;
  },

  // =========================
  // PRODUCTOS / STOCK
  // (Tu app usa name/price/stock_qty/active. La BD guarda nombre/precio/stock/activo)
  // =========================
  async listProducts() {
    const { rows } = await db.query(
      `SELECT
         id,
         nombre AS name,
         precio AS price,
         stock AS stock_qty,
         activo AS active
       FROM public.productos
       ORDER BY nombre ASC`
    );
    return rows;
  },

  async getProduct(id) {
    const { rows } = await db.query(
      `SELECT
         id,
         nombre AS name,
         precio AS price,
         stock AS stock_qty,
         activo AS active
       FROM public.productos
       WHERE id = $1`,
      [Number(id)]
    );
    return rows[0] || null;
  },

  async createProduct(payload) {
    const name = (payload.name || "").trim() || "Producto";
    const price = toNum(payload.price);
    const stock_qty = toNum(payload.stock_qty);
    const active = payload.active !== undefined ? !!payload.active : true;

    const { rows } = await db.query(
      `INSERT INTO public.productos (nombre, precio, stock, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         nombre AS name,
         precio AS price,
         stock AS stock_qty,
         activo AS active`,
      [name, price, stock_qty, active]
    );
    return rows[0];
  },

  async updateProduct(id, payload) {
    const current = await this.getProduct(id);
    if (!current) return null;

    const name = payload.name !== undefined ? String(payload.name).trim() : current.name;
    const price = payload.price !== undefined ? toNum(payload.price) : toNum(current.price);
    const stock_qty =
      payload.stock_qty !== undefined ? toNum(payload.stock_qty) : toNum(current.stock_qty);
    const active = payload.active !== undefined ? !!payload.active : !!current.active;

    const { rows } = await db.query(
      `UPDATE public.productos
       SET nombre = $1,
           precio = $2,
           stock = $3,
           activo = $4,
           actualizado_en = NOW()
       WHERE id = $5
       RETURNING
         id,
         nombre AS name,
         precio AS price,
         stock AS stock_qty,
         activo AS active`,
      [name, price, stock_qty, active, Number(id)]
    );
    return rows[0] || null;
  },

  async deleteProduct(id) {
    // delete lógico como venías haciendo
    const r = await db.query(
      `UPDATE public.productos
       SET activo = FALSE, actualizado_en = NOW()
       WHERE id = $1`,
      [Number(id)]
    );
    return r.rowCount > 0;
  },

  // =========================
  // VENTAS (SEPARADAS) + RESUMEN
  // Controllers llaman createSale/listSales/etc.
  // Internamente guardamos en ventas_cantera / ventas_viajes y listamos desde una VIEW ventas_resumen
  // =========================
  async createSale(payload) {
    const sale_type = String(payload.sale_type || "").toUpperCase(); // 'CANTERA' | 'VIAJES'
    const sale_datetime = payload.sale_datetime; // viene del input datetime-local
    const client_id = payload.client_id ? Number(payload.client_id) : null;

    const product_id = payload.product_id ? Number(payload.product_id) : null;
    const product_price = toNum(payload.product_price);
    const qty = Math.max(1, toNum(payload.qty || 1));

    const payment_method = payload.payment_method || "efectivo";
    const paid_amount = toNum(payload.paid_amount);
    const final_price = toNum(payload.final_price);

    if (sale_type === "CANTERA") {
      const { rows } = await db.query(
        `INSERT INTO public.ventas_cantera
          (fecha_hora, cliente_id, producto_id, precio_producto, cantidad, total, medio_pago, pagado)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          sale_datetime,
          client_id,
          product_id,
          product_price,
          qty,
          final_price,
          payment_method,
          paid_amount,
        ]
      );
      return rows[0];
    }

    if (sale_type === "VIAJES") {
      const phone = payload.phone || null;
      const driver_name = payload.driver_name || null;
      const address = payload.address || null;

      const freight_price = toNum(payload.freight_price);

      const { rows } = await db.query(
        `INSERT INTO public.ventas_viajes
          (fecha_hora, cliente_id, telefono, chofer, direccion, producto_id, precio_producto, cantidad, precio_flete, total, medio_pago, pagado)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          sale_datetime,
          client_id,
          phone,
          driver_name,
          address,
          product_id,
          product_price,
          qty,
          freight_price,
          final_price,
          payment_method,
          paid_amount,
        ]
      );
      return rows[0];
    }

    throw new Error(`sale_type inválido: ${sale_type}`);
  },

  async listSales() {
    const { rows } = await db.query(
      `SELECT
         id,
         tipo_venta AS sale_type,
         fecha_hora AS sale_datetime,
         cliente_id AS client_id,

         telefono AS phone,
         chofer AS driver_name,
         direccion AS address,

         producto_id AS product_id,
         precio_producto AS product_price,
         cantidad AS qty,
         precio_flete AS freight_price,

         total AS final_price,
         medio_pago AS payment_method,
         pagado AS paid_amount
       FROM public.ventas_resumen
       ORDER BY fecha_hora ASC`
    );
    return rows;
  },

  async getSale(id) {
    const { rows } = await db.query(
      `SELECT
         id,
         tipo_venta AS sale_type,
         fecha_hora AS sale_datetime,
         cliente_id AS client_id,

         telefono AS phone,
         chofer AS driver_name,
         direccion AS address,

         producto_id AS product_id,
         precio_producto AS product_price,
         cantidad AS qty,
         precio_flete AS freight_price,

         total AS final_price,
         medio_pago AS payment_method,
         pagado AS paid_amount
       FROM public.ventas_resumen
       WHERE id = $1
       LIMIT 1`,
      [Number(id)]
    );
    return rows[0] || null;
  },

  async listSalesByTypeBetween(type, fromISO, toISO) {
    const t = String(type || "").toUpperCase();
    const { rows } = await db.query(
      `SELECT
         id,
         tipo_venta AS sale_type,
         fecha_hora AS sale_datetime,
         cliente_id AS client_id,

         telefono AS phone,
         chofer AS driver_name,
         direccion AS address,

         producto_id AS product_id,
         precio_producto AS product_price,
         cantidad AS qty,
         precio_flete AS freight_price,

         total AS final_price,
         medio_pago AS payment_method,
         pagado AS paid_amount
       FROM public.ventas_resumen
       WHERE tipo_venta = $1
         AND fecha_hora::date BETWEEN $2::date AND $3::date
       ORDER BY fecha_hora ASC`,
      [t, fromISO, toISO]
    );
    return rows;
  },

  async listSalesByTypeOnDay(type, dayISO, clientId) {
    const t = String(type || "").toUpperCase();
    const params = [t, dayISO];
    let sql = `
      SELECT
        id,
        tipo_venta AS sale_type,
        fecha_hora AS sale_datetime,
        cliente_id AS client_id,

        telefono AS phone,
        chofer AS driver_name,
        direccion AS address,

        producto_id AS product_id,
        precio_producto AS product_price,
        cantidad AS qty,
        precio_flete AS freight_price,

        total AS final_price,
        medio_pago AS payment_method,
        pagado AS paid_amount
      FROM public.ventas_resumen
      WHERE tipo_venta = $1
        AND fecha_hora::date = $2::date
    `;

    if (clientId) {
      sql += ` AND cliente_id = $3`;
      params.push(Number(clientId));
    }

    sql += ` ORDER BY fecha_hora ASC`;

    const { rows } = await db.query(sql, params);
    return rows;
  },

  // =========================
  // PAGOS
  // addPayment recibe sale_id y method; detectamos si esa venta es cantera o viajes
  // porque los IDs son globales (comparten la misma secuencia)
  // =========================
  async listPayments() {
    const { rows } = await db.query(
      `SELECT
         id,
         venta_id AS sale_id,
         monto AS amount,
         metodo AS method,
         fecha_pago AS paid_datetime
       FROM public.pagos
       ORDER BY fecha_pago ASC`
    );
    return rows;
  },

  async addPayment(payload) {
    const sale_id = Number(payload.sale_id);
    const amount = toNum(payload.amount);
    const method = payload.method || "efectivo";

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert pago
      const payRes = await client.query(
        `INSERT INTO public.pagos (venta_id, monto, metodo, fecha_pago)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, venta_id AS sale_id, monto AS amount, metodo AS method, fecha_pago AS paid_datetime`,
        [sale_id, amount, method]
      );

      // Actualizar pagado en la tabla correcta (cantera o viajes)
      const can = await client.query(
        `SELECT id, total, pagado FROM public.ventas_cantera WHERE id=$1 FOR UPDATE`,
        [sale_id]
      );

      if (can.rows.length) {
        const total = toNum(can.rows[0].total);
        const pagado = toNum(can.rows[0].pagado);
        let nuevo = pagado + amount;
        if (nuevo > total) nuevo = total;

        await client.query(
          `UPDATE public.ventas_cantera SET pagado=$1 WHERE id=$2`,
          [nuevo, sale_id]
        );

        await client.query("COMMIT");
        return payRes.rows[0];
      }

      const via = await client.query(
        `SELECT id, total, pagado FROM public.ventas_viajes WHERE id=$1 FOR UPDATE`,
        [sale_id]
      );

      if (via.rows.length) {
        const total = toNum(via.rows[0].total);
        const pagado = toNum(via.rows[0].pagado);
        let nuevo = pagado + amount;
        if (nuevo > total) nuevo = total;

        await client.query(
          `UPDATE public.ventas_viajes SET pagado=$1 WHERE id=$2`,
          [nuevo, sale_id]
        );

        await client.query("COMMIT");
        return payRes.rows[0];
      }

      throw new Error(`No existe una venta con id=${sale_id} (ni en cantera ni en viajes)`);

    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};
