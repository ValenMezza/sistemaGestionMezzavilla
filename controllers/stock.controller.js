const store = require('../stores/store');

exports.index = async (req, res) => {
  const products = await store.listProducts();
  res.render('stock/index', { products });
};

exports.viewCreate = async (req, res) => {
  res.render('stock/form', { mode: 'create', product: null, error: null });
};

exports.create = async (req, res) => {
  const { name, price, stock_qty, active } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).render('stock/form', { mode: 'create', product: null, error: 'Falta nombre' });
  }
  await store.createProduct({
    name,
    price,
    stock_qty,
    active: active === 'on'
  });
  res.redirect('/stock');
};

exports.viewEdit = async (req, res) => {
  const product = await store.getProduct(req.params.id);
  if (!product) return res.redirect('/stock');
  res.render('stock/form', { mode: 'edit', product, error: null });
};

exports.update = async (req, res) => {
  const { name, price, stock_qty, active } = req.body;
  const product = await store.getProduct(req.params.id);
  if (!product) return res.redirect('/stock');

  await store.updateProduct(req.params.id, {
    name,
    price,
    stock_qty,
    active: active === 'on'
  });

  res.redirect('/stock');
};

exports.remove = async (req, res) => {
  await store.deleteProduct(req.params.id);
  res.redirect('/stock');
};
