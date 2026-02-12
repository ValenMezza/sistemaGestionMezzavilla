const router = require('express').Router();
const auth = require('../controllers/auth.controller');

router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', auth.viewLogin);
router.post('/login', auth.doLogin);
router.post('/logout', auth.logout);

module.exports = router;
