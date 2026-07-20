const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getGlobalStatistics,
  getLocalStatistics,
  getClientStatistics,
  getRanking
} = require('../controllers/statsController');

const router = express.Router();

router.use(requireAuth);
router.get('/global', getGlobalStatistics);
router.get('/local', getLocalStatistics);
router.get('/client', getClientStatistics);
router.get('/ranking', getRanking);

module.exports = router;
