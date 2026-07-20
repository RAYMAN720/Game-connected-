const express=require('express');const cors=require('cors');
const app=express();const port=Number(process.env.PORT||3000);app.use(cors());app.use(express.json({limit:'1mb'}));
const services={catalog:process.env.CATALOG_URL||'http://catalog-service:3001',match:process.env.MATCH_URL||'http://match-service:3002',tournament:process.env.TOURNAMENT_URL||'http://tournament-service:3003'};
function serviceFor(path){if(path.startsWith('/api/matches'))return services.match;if(path.startsWith('/api/tournaments')||path.startsWith('/api/teams')||path.startsWith('/api/statistics'))return services.tournament;return services.catalog;}
async function readJson(url){try{const r=await fetch(url);return await r.json();}catch(e){return{status:'OFFLINE',database:'OFFLINE',mqtt:'OFFLINE',error:e.message};}}
app.get('/api/health',async(req,res)=>{const[c,m,t]=await Promise.all([readJson(`${services.catalog}/health`),readJson(`${services.match}/health`),readJson(`${services.tournament}/health`)]);const ok=[c,m,t].every(x=>x.status==='ONLINE'&&x.database==='ONLINE');res.status(ok?200:503).json({backend:ok?'ONLINE':'DEGRADED',database:ok?'ONLINE':'OFFLINE',mqtt:m.mqtt||'OFFLINE',services:{catalog:c.status,match:m.status,tournament:t.status},timestamp:new Date().toISOString()});});
app.use('/api',async(req,res)=>{try{
  const target=`${serviceFor(req.originalUrl)}${req.originalUrl}`;const headers={accept:req.header('accept')||'application/json'};if(req.header('x-user-id'))headers['x-user-id']=req.header('x-user-id');if(req.header('x-session-id'))headers['x-session-id']=req.header('x-session-id');if(!['GET','HEAD'].includes(req.method))headers['content-type']='application/json';
  const response=await fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(req.body||{})});const text=await response.text();res.status(response.status);const type=response.headers.get('content-type');if(type)res.type(type);return res.send(text);
}catch(e){return res.status(502).json({message:`Servizio non raggiungibile: ${e.message}`});}});
app.listen(port,()=>console.log(`API gateway sulla porta ${port}`));
