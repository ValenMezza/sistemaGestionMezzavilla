const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const home = require('../controllers/home.controller');

router.get('/', requireAuth, home.viewHome);

module.exports = router;
