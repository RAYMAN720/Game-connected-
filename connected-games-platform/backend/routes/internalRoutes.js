const express = require('express');
const { requireEdgeKey, getEdgeGameConfiguration } = require('../controllers/internalController');

const router = express.Router();
router.use(requireEdgeKey);
router.get('/edge-config/:deviceId/games/:gameId', getEdgeGameConfiguration);

module.exports = router;
