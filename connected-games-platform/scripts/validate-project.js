const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');let failures=[];let checks=0;
function check(condition,message){checks++;if(!condition)failures.push(message);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const htmlFiles=walk(path.join(root,'frontend')).filter(f=>f.endsWith('.html'));
for(const file of htmlFiles){const text=fs.readFileSync(file,'utf8');for(const match of text.matchAll(/(?:src|href)="([^"]+)"/g)){const ref=match[1];if(ref.startsWith('http')||ref.startsWith('#'))continue;const target=path.resolve(path.dirname(file),ref);check(fs.existsSync(target),`${path.relative(root,file)} references missing ${ref}`);}}
const required=['frontend/game-admin-dashboard.html','frontend/game-admin-devices.html','frontend/local-admin-devices.html','frontend/platform-users.html','frontend/teams.html','gateway/server.js','simulator/public/index.html','docs/00-relazione-finale.md','docs/openapi.yaml',
  'scripts/integration-test.js',
  'START_HERE.md',
  'SUBMISSION_CHECKLIST.md'];
for(const name of required)check(fs.existsSync(path.join(root,name)),`Missing required file ${name}`);
const sql=fs.readFileSync(path.join(root,'database/init.sql'),'utf8');for(const item of ['GAME_ADMIN','game_types','sensor_templates','actuators','teams','tournament_locations','participant_mode'])check(sql.includes(item),`Database missing ${item}`);
const compose=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');for(const service of ['catalog-service','match-service','tournament-service','api-gateway','edge-service'])check(compose.includes(`${service}:`),`Compose missing ${service}`);
if(failures.length){console.error(`FAILED ${failures.length}/${checks}`);for(const f of failures)console.error(`- ${f}`);process.exit(1);}console.log(`Project validation passed: ${checks} checks`);
