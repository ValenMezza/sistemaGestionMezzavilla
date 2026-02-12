const express = require('express');
const router = express.Router();

const clientesController = require('../controllers/clientes.controller');

// LISTADO
router.get('/', clientesController.list);

// CREAR (FORM + POST)
router.get('/nuevo', clientesController.viewCreate);
router.post('/nuevo', clientesController.create);

// EDITAR (FORM + POST)
router.get('/:id/editar', clientesController.viewEdit);
router.post('/:id/editar', clientesController.update);

// PDF (resúmenes por cliente)
router.get('/:id/pdf/mensual', clientesController.pdfMensualCliente);
router.get('/:id/pdf/semanal', clientesController.pdfSemanalCliente);

// PAGOS (saldar deuda desde clientes)
router.post('/:id/pagos', clientesController.registrarPagoCliente);

// ELIMINAR
router.post('/:id/eliminar', clientesController.remove);

module.exports = router;
