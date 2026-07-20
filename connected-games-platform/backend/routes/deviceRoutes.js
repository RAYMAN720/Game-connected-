const express=require('express');const {requireAuth}=require('../middleware/auth');const c=require('../controllers/deviceController');
const router=express.Router();router.use(requireAuth);
router.get('/devices',c.getDevices);router.post('/devices',c.createDevice);router.put('/devices/:id',c.updateDevice);router.delete('/devices/:id',c.deleteDevice);
router.get('/sensors',c.getSensors);router.post('/sensors',c.createSensor);router.put('/sensors/:id',c.updateSensor);router.delete('/sensors/:id',c.deleteSensor);
router.get('/actuators',c.getActuators);router.post('/actuators',c.createActuator);router.put('/actuators/:id',c.updateActuator);router.delete('/actuators/:id',c.deleteActuator);router.post('/actuators/:id/state',c.setActuatorState);
module.exports=router;
