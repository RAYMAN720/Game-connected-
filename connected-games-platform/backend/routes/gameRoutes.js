const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getGames,
  createGame,
  updateGame,
  deleteGame
} = require('../controllers/gameController');

const router = express.Router();

router.use(requireAuth);
router.get('/', getGames);
router.post('/', createGame);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);

module.exports = router;
