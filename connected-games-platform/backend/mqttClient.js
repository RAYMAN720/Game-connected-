const mqtt=require('mqtt');
const {processMatchEvent,getMatchRow}=require('./services/matchEventService');
const EVENT_TOPIC='locales/+/games/+/matches/+/events';
const HEARTBEAT_TOPIC='locales/+/edge/+/heartbeat';
let client=null;let online=false;
function url(){return process.env.MQTT_URL||`mqtt://${process.env.MQTT_HOST||'mqtt-broker'}:${process.env.MQTT_PORT||1883}`;}
function connectMqtt(){
  if(client)return client;client=mqtt.connect(url(),{clientId:`match-service-${Math.random().toString(16).slice(2)}`,reconnectPeriod:2000,clean:false});
  client.on('connect',()=>{online=true;client.subscribe([EVENT_TOPIC,HEARTBEAT_TOPIC],{qos:1});console.log('MQTT match service online');});
  client.on('close',()=>{online=false;});client.on('error',e=>{online=false;console.error(e.message);});
  client.on('message',async(topic,buffer)=>{try{const p=JSON.parse(buffer.toString());if(topic.includes('/heartbeat'))return; if(!p.event_uuid)throw new Error('event_uuid obbligatorio');await processMatchEvent(p);}catch(e){console.error(`MQTT rifiutato: ${e.message}`);}});
  return client;
}
function getMqttStatus(){return online?'ONLINE':'OFFLINE';}
async function startMqttSimulation(matchId){
  const match=await getMatchRow(matchId);if(!match){const e=new Error('Partita non trovata');e.status=404;throw e;}
  const edgeUrl=process.env.EDGE_URL||'http://edge-service:4000';
  const response=await fetch(`${edgeUrl}/simulate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match_id:match.id,game_id:match.game_id,locale_id:match.locale_id,device_id:Number(process.env.SIMULATOR_DEVICE_ID||1),player1_name:match.player1_name,player2_name:match.player2_name})});
  if(!response.ok){const text=await response.text();const e=new Error(`Edge simulator non disponibile: ${text}`);e.status=502;throw e;}
  return {alreadyRunning:false,edge:await response.json()};
}
module.exports={connectMqtt,getMqttStatus,startMqttSimulation};
