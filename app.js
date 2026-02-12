var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var ejs = require('ejs');

if (process.env.NODE_ENV !== 'production') { require('dotenv').config(); }
// =======================
//   HEALTHCHECK
// =======================

// =======================
//   ROUTES
// =======================
var authRoutes = require('./routes/auth.routes');
var homeRoutes = require('./routes/home.routes');
var canteraRoutes = require('./routes/cantera.routes');
var viajesRoutes = require('./routes/viajes.routes');
var stockRoutes = require('./routes/stock.routes');
var clientesRoutes = require('./routes/clientes.routes');


// =======================
//   APP
// =======================
var app = express();
app.get('/health', (req, res) => res.status(200).send('ok'));

// =======================
//   VIEW ENGINE (EJS FORZADO)
// =======================
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejs.__express);   // 🔥 FORZAMOS EL ENGINE OFICIAL
app.set('view engine', 'ejs');
app.set('view cache', false);       // 🔥 evitamos cache raro

// =======================
//   MIDDLEWARES
// =======================
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =======================
//   ESTÁTICOS
// =======================
app.use(express.static(path.join(__dirname, 'public')));

// =======================
//   SESSION
// =======================
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8 // 8 horas
    }
  })
);

// =======================
//   GLOBALS PARA EJS
// =======================
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// =======================
//   ROUTES
// =======================
app.use('/', authRoutes);
app.use('/home', homeRoutes);
app.use('/cantera', canteraRoutes);
app.use('/viajes', viajesRoutes);
app.use('/stock', stockRoutes);
app.use('/clientes', clientesRoutes);

// =======================
//   404
// =======================
app.use(function (req, res, next) {
  next(createError(404));
});

// =======================
//   ERROR HANDLER
// =======================
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    error: err
  });
});

module.exports = app;
