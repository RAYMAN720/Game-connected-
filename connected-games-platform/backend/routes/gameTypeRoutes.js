const express=require('express');
const {requireAuth}=require('../middleware/auth');
const c=require('../controllers/gameTypeController');
const router=express.Router();router.use(requireAuth);
router.get('/',c.getGameTypes);router.post('/',c.createGameType);router.get('/:id',c.getGameTypeById);router.put('/:id',c.updateGameType);router.delete('/:id',c.deleteGameType);router.post('/:id/sensor-templates',c.createSensorTemplate);router.delete('/:id/sensor-templates/:templateId',c.deleteSensorTemplate);
module.exports=router;
