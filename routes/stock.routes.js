const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const s = require('../controllers/stock.controller');

router.get('/', requireAuth, s.index);
router.get('/nuevo', requireAuth, s.viewCreate);
router.post('/nuevo', requireAuth, s.create);

router.get('/:id/editar', requireAuth, s.viewEdit);
router.post('/:id/editar', requireAuth, s.update);

router.post('/:id/eliminar', requireAuth, s.remove);

module.exports = router;
