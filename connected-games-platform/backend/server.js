/* Modalita semplice: avvia tutti i moduli in un solo processo.
   Docker usa invece serviceServer.js in tre container separati. */
const express=require('express');const cors=require('cors');require('dotenv').config();
const {pingDatabase,waitForDatabase}=require('./db');const {ensureSupportSchema}=require('./schemaBootstrap');const {connectMqtt,getMqttStatus}=require('./mqttClient');
const app=express();app.use(cors());app.use(express.json());
app.get('/api/health',async(req,res)=>{try{await pingDatabase();res.json({backend:'ONLINE',database:'ONLINE',mqtt:getMqttStatus(),timestamp:new Date().toISOString()});}catch(e){res.status(503).json({backend:'ONLINE',database:'OFFLINE',mqtt:getMqttStatus(),timestamp:new Date().toISOString()});}});
app.use('/internal',require('./routes/internalRoutes'));app.use('/api/auth',require('./routes/authRoutes'));app.use('/api/locales',require('./routes/localeRoutes'));app.use('/api/games',require('./routes/gameRoutes'));app.use('/api/users',require('./routes/userRoutes'));app.use('/api/game-types',require('./routes/gameTypeRoutes'));app.use('/api',require('./routes/deviceRoutes'));app.use('/api/matches',require('./routes/matchRoutes'));app.use('/api/tournaments',require('./routes/tournamentRoutes'));app.use('/api/teams',require('./routes/teamRoutes'));app.use('/api/statistics',require('./routes/statsRoutes'));
app.use((req,res)=>res.status(404).json({message:'Rotta non trovata'}));app.use((e,req,res,next)=>{console.error(e);res.status(e.status||500).json({message:e.message||'Errore interno'});});
waitForDatabase().then(async()=>{await ensureSupportSchema();connectMqtt();app.listen(process.env.PORT||3000,()=>console.log('Backend completo online'));}).catch(e=>{console.error(e);process.exit(1);});
