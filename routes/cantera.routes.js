const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const c = require('../controllers/cantera.controller');

router.get('/', requireAuth, c.viewDashboard);

router.get('/vender', requireAuth, c.viewVender);
router.post('/vender', requireAuth, c.createVenta);

// Selector de mes+semana
router.get('/semanal', requireAuth, c.viewSemanalSelector);
router.get('/semanal/pdf', requireAuth, c.pdfSemanal);

// Ya elegido el día
router.get('/resumen/dia', requireAuth, c.viewResumenDia);
router.get('/resumen/dia/pdf', requireAuth, c.pdfResumenDia);

router.post('/pagos', requireAuth, c.registrarPago);

// Placeholder mensual
router.get('/mensual', requireAuth, c.viewMensual);
router.get('/mensual/pdf', requireAuth, c.pdfMensual);

module.exports = router;
