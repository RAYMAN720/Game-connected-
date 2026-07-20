function currentUser(){return getStoredUser();}
function redirectByRole(user){
  const pages={PLATFORM_ADMIN:'platform-admin-dashboard.html',LOCAL_ADMIN:'local-admin-dashboard.html',GAME_ADMIN:'game-admin-dashboard.html',CLIENT:'client-dashboard.html'};
  window.location.href=pages[user.role]||'login.html';
}
function requireUser(allowedRoles=[]){
  const user=currentUser();if(!user){window.location.href='login.html';return null;}
  if(allowedRoles.length&&!allowedRoles.includes(user.role)){redirectByRole(user);return null;}
  document.body.classList.toggle('client-theme',user.role==='CLIENT');document.body.classList.toggle('admin-theme',user.role!=='CLIENT');document.body.classList.toggle('platform-theme',user.role==='PLATFORM_ADMIN');document.body.classList.toggle('local-theme',user.role==='LOCAL_ADMIN');document.body.classList.toggle('game-admin-theme',user.role==='GAME_ADMIN');
  const badge=$('#user-badge');if(badge)badge.textContent=`${user.username} - ${roleLabel(user.role)}`;return user;
}
function roleLabel(role){return{PLATFORM_ADMIN:'Amministratore piattaforma',LOCAL_ADMIN:'Amministratore locale',GAME_ADMIN:'Amministratore gioco',CLIENT:'Giocatore'}[role]||role;}
async function logout(){try{await apiPost('/auth/logout',{});}catch(error){}clearStoredUser();window.location.href='login.html';}
function renderSidebar(activePage){
  const user=currentUser(),sidebar=$('#sidebar');if(!user||!sidebar)return;
  const linksByRole={
    PLATFORM_ADMIN:[['platform-admin-dashboard.html','dashboard','▦ Cruscotto'],['platform-locales.html','locales','⌂ Locali'],['platform-users.html','users','♟ Utenti'],['teams.html','teams','◆ Squadre'],['platform-statistics.html','statistics','▤ Statistiche'],['tournaments.html','tournaments','★ Tornei']],
    LOCAL_ADMIN:[['local-admin-dashboard.html','dashboard','▦ Cruscotto'],['local-admin-games.html','games','◈ Giochi'],['local-admin-devices.html','devices','⌁ Edge e sensori'],['teams.html','teams','◆ Squadre'],['local-admin-matches.html','matches','▣ Partite'],['local-admin-statistics.html','statistics','▤ Statistiche'],['tournaments.html','tournaments','★ Tornei'],['live-match.html','live','● Partita live']],
    GAME_ADMIN:[['game-admin-dashboard.html','dashboard','▦ Tipi di gioco'],['game-admin-devices.html','devices','⌁ Sensori e attuatori'],['tournaments.html','tournaments','★ Tornei']],
    CLIENT:[['client-dashboard.html','dashboard','▦ Cruscotto'],['client-games.html','games','◈ Giochi'],['client-matches.html','matches','▣ Partite'],['client-statistics.html','statistics','▤ Classifica'],['tournaments.html','tournaments','★ Tornei'],['live-match.html','live','● Partita live']]
  };
  const links=linksByRole[user.role]||[];sidebar.className='sidebar';sidebar.innerHTML=`<div class="sidebar-logo"><div class="brand-lockup"><img src="img/brand-mark.svg" alt="PlayConnect" class="brand-mark"><div><strong>PlayConnect</strong><span>Piattaforma giochi connessi</span></div></div><em class="badge role-badge">${roleLabel(user.role)}</em></div><nav class="nav-list">${links.map(([href,key,label])=>`<a class="nav-link ${key===activePage?'active':''}" href="${href}">${label}</a>`).join('')}</nav><div class="sidebar-footer"><div id="system-status" class="system-status"></div><span class="badge">${escapeHtml(user.username)}</span><button class="btn ghost" type="button" onclick="logout()">Esci</button></div>`;
  if(typeof startSystemStatusPolling==='function')startSystemStatusPolling();
}
Object.assign(window,{currentUser,redirectByRole,requireUser,roleLabel,logout,renderSidebar});
async function initLogin(){const form=$('#login-form'),errorBox=$('#login-error');if(!form)return;$all('.login-preset').forEach(button=>button.addEventListener('click',()=>{$('#username').value=button.dataset.username;$('#password').value=button.dataset.password;$all('.login-preset').forEach(x=>x.classList.remove('active'));button.classList.add('active');}));const existing=currentUser();if(existing){redirectByRole(existing);return;}form.addEventListener('submit',async event=>{event.preventDefault();errorBox.textContent='';try{const user=await apiRequest('/auth/login',{method:'POST',skipAuth:true,body:getFormData(form)});setStoredUser(user);redirectByRole(user);}catch(error){errorBox.textContent=error.message;}});}
document.addEventListener('DOMContentLoaded',initLogin);
