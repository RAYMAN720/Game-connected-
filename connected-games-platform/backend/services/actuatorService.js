const mqtt = require('mqtt');
const { query } = require('../db');

let publisher;
let online = false;
function mqttUrl(){return process.env.MQTT_URL || `mqtt://${process.env.MQTT_HOST || 'mqtt-broker'}:${process.env.MQTT_PORT || 1883}`;}
function getPublisher(){
  if(!publisher){
    publisher=mqtt.connect(mqttUrl(),{clientId:`actuator-publisher-${Math.random().toString(16).slice(2)}`,reconnectPeriod:2000});
    publisher.on('connect',()=>{online=true;});publisher.on('close',()=>{online=false;});publisher.on('error',()=>{online=false;});
  }
  return publisher;
}
function publish(topic,payload){
  const client=getPublisher();
  if(!online)return;
  client.publish(topic,JSON.stringify(payload),{qos:1,retain:true});
}
async function updateActuators(match,phase){
  const rows=await query('SELECT * FROM actuators WHERE game_id=? AND status=\'ACTIVE\'',[match.game_id]);
  for(const actuator of rows){
    let state='IDLE';
    if(actuator.actuator_type==='SCOREBOARD'){
      if(phase==='START')state=`LIVE ${match.score1}-${match.score2}`;
      if(phase==='SCORE')state=`SCORE ${match.score1}-${match.score2}`;
      if(phase==='END')state=`FINAL ${match.score1}-${match.score2}`;
    }else if(actuator.actuator_type==='LED'){
      state=phase==='START'?'ON':phase==='SCORE'?'FLASH':'OFF';
    }else state=phase;
    await query('UPDATE actuators SET state=? WHERE id=?',[state,actuator.id]);
    publish(actuator.mqtt_topic,{actuator_id:actuator.id,game_id:match.game_id,state,updated_at:new Date().toISOString()});
  }
}
module.exports={updateActuators};
