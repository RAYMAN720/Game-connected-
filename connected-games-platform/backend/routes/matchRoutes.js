const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  startMatch,
  addMatchEvent,
  endMatch,
  simulateMatchMqtt,
  getMatches,
  getCurrentMatch,
  getMatchById
} = require('../controllers/matchController');

const router = express.Router();

router.use(requireAuth);
router.post('/start', startMatch);
router.post('/:id/simulate-mqtt', simulateMatchMqtt);
router.post('/:id/events', addMatchEvent);
router.post('/:id/end', endMatch);
router.get('/', getMatches);
router.get('/current', getCurrentMatch);
router.get('/:id', getMatchById);

module.exports = router;
