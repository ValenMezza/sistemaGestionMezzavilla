const store = require('../stores/store');

exports.viewLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.doLogin = async (req, res) => {
  const { username, password } = req.body;

  const user = await store.findUserByUsername(username);
  if (!user || user.password !== password) {
    return res.status(401).render('login', { error: 'Usuario o contraseña inválidos' });
  }

  req.session.user = { id: user.id, username: user.username };
  return res.redirect('/home');
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};
