const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getLocales,
  createLocale,
  updateLocale,
  deleteLocale
} = require('../controllers/localeController');

const router = express.Router();

router.use(requireAuth);
router.get('/', getLocales);
router.post('/', createLocale);
router.put('/:id', updateLocale);
router.delete('/:id', deleteLocale);

module.exports = router;
