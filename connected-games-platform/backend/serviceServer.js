const express=require('express');const cors=require('cors');require('dotenv').config();
const {pingDatabase,waitForDatabase}=require('./db');const {ensureSupportSchema}=require('./schemaBootstrap');const {connectMqtt,getMqttStatus}=require('./mqttClient');
const authRoutes=require('./routes/authRoutes');const localeRoutes=require('./routes/localeRoutes');const gameRoutes=require('./routes/gameRoutes');const userRoutes=require('./routes/userRoutes');const gameTypeRoutes=require('./routes/gameTypeRoutes');const deviceRoutes=require('./routes/deviceRoutes');
const internalRoutes=require('./routes/internalRoutes');const matchRoutes=require('./routes/matchRoutes');const tournamentRoutes=require('./routes/tournamentRoutes');const teamRoutes=require('./routes/teamRoutes');const statsRoutes=require('./routes/statsRoutes');
const app=express();const mode=process.env.SERVICE_MODE||'catalog';const port=Number(process.env.PORT||3001);
app.use(cors());app.use(express.json());
app.get('/health',async(req,res)=>{try{await pingDatabase();res.json({service:mode,status:'ONLINE',database:'ONLINE',mqtt:mode==='match'?getMqttStatus():'N/A',timestamp:new Date().toISOString()});}catch(e){res.status(503).json({service:mode,status:'ONLINE',database:'OFFLINE',mqtt:mode==='match'?getMqttStatus():'N/A',timestamp:new Date().toISOString()});}});
if(mode==='catalog'){
  app.use('/internal',internalRoutes);app.use('/api/auth',authRoutes);app.use('/api/locales',localeRoutes);app.use('/api/games',gameRoutes);app.use('/api/users',userRoutes);app.use('/api/game-types',gameTypeRoutes);app.use('/api',deviceRoutes);
}else if(mode==='match') app.use('/api/matches',matchRoutes);
else if(mode==='tournament'){app.use('/api/tournaments',tournamentRoutes);app.use('/api/teams',teamRoutes);app.use('/api/statistics',statsRoutes);}
else throw new Error(`SERVICE_MODE sconosciuto: ${mode}`);
app.use((req,res)=>res.status(404).json({message:`Rotta non trovata nel servizio ${mode}`}));
app.use((error,req,res,next)=>{console.error(error);res.status(error.status||500).json({message:error.message||'Errore interno'});});
waitForDatabase().then(async()=>{if(mode==='catalog')await ensureSupportSchema();if(mode==='match')connectMqtt();app.listen(port,()=>console.log(`${mode} service sulla porta ${port}`));}).catch(e=>{console.error(e);process.exit(1);});
