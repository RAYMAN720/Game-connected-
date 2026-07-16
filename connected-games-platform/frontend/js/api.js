const API_BASE = '/api';
const USER_KEY = 'connectedGamesUser';
let systemStatusTimer = null;

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('currentMatchId');
}

async function apiRequest(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth) {
    const user = getStoredUser();
    if (user) {
      headers['X-User-Id'] = user.id;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredUser();
      window.location.href = 'login.html';
    }
    throw new Error(data?.message || 'Richiesta non riuscita');
  }

  return data;
}

function apiGet(path, options = {}) {
  return apiRequest(path, { ...options, method: 'GET' });
}

function apiPost(path, body = null, options = {}) {
  return apiRequest(path, {
    ...options,
    method: 'POST',
    body
  });
}

async function checkSystemStatus() {
  try {
    const status = await apiRequest('/health', { skipAuth: true });
    renderSystemStatus(status);
    return status;
  } catch (error) {
    renderSystemStatus({
      backend: 'OFFLINE',
      database: 'OFFLINE',
      mqtt: 'OFFLINE',
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

function renderSystemStatus(status) {
  const target = $('#system-status');
  if (!target) {
    return;
  }

  target.innerHTML = `
    <div class="system-status-row">
      <span class="badge status-${String(status.backend).toLowerCase()}">Server ${escapeHtml(statusLabel(status.backend))}</span>
      <span class="badge status-${String(status.mqtt).toLowerCase()}">MQTT ${escapeHtml(status.mqtt)}</span>
    </div>
    <span class="sync-note">Ultimo aggiornamento: ${formatDate(status.timestamp)}</span>
  `;
}

function startSystemStatusPolling() {
  if (systemStatusTimer) {
    return;
  }

  checkSystemStatus();
  systemStatusTimer = setInterval(checkSystemStatus, 5000);
}

function startAutoRefresh(callback, interval) {
  callback();
  return setInterval(callback, interval);
}

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function statusLabel(status) {
  return {
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    LIVE: 'IN CORSO',
    FINISHED: 'TERMINATA',
    IN_GAME: 'IN PARTITA',
    SYNC_PENDING: 'SYNC IN ATTESA',
    ACTIVE: 'ATTIVO',
    INACTIVE: 'INATTIVO',
    SYNCED: 'SINCRONIZZATO'
  }[status] || status;
}

function showMessage(target, message, type = 'empty') {
  const element = typeof target === 'string' ? $(target) : target;
  if (element) {
    element.innerHTML = `<div class="${type}">${escapeHtml(message)}</div>`;
  }
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

Object.assign(window, {
  apiRequest,
  apiGet,
  apiPost,
  checkSystemStatus,
  startSystemStatusPolling,
  startAutoRefresh,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  $,
  $all,
  escapeHtml,
  formatDate,
  statusLabel,
  showMessage,
  getFormData
});
