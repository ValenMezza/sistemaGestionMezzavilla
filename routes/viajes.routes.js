const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const v = require('../controllers/viajes.controller');

router.get('/', requireAuth, v.viewDashboard);

// Historial / Programados
router.get('/historial', requireAuth, v.viewHistorial);
router.get('/programados', requireAuth, v.viewProgramados);

router.get('/vender', requireAuth, v.viewVender);
router.post('/vender', requireAuth, v.createVenta);

router.get('/semanal', requireAuth, v.viewSemanalSelector);
router.get('/semanal/pdf', requireAuth, v.pdfSemanal);

router.get('/resumen/dia', requireAuth, v.viewResumenDia);
router.get('/resumen/dia/pdf', requireAuth, v.pdfResumenDia);

router.post('/pagos', requireAuth, v.registrarPago);

router.get('/mensual', requireAuth, v.viewMensual);
router.get('/mensual/pdf', requireAuth, v.pdfMensual);

module.exports = router;
