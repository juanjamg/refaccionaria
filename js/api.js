// ==========================================
// API.JS - CLIENTE HTTP PARA LA API REST PHP (CON CREDENCIALES Y AUTH)
// ==========================================

const API_BASE = 'api';

async function apiRequest(endpoint, options = {}) {
  const fetchOptions = {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  const res = await fetch(`${API_BASE}/${endpoint}`, fetchOptions);
  const json = await res.json().catch(() => null);

  if (res.status === 401) {
    if (typeof window.handleAuthRequired === 'function') {
      window.handleAuthRequired();
    }
    throw new Error((json && json.message) || 'Sesión no autorizada o expirada. Inicie sesión nuevamente.');
  }

  if (!res.ok || !json || !json.success) {
    throw new Error((json && json.message) || 'Error de comunicación con el servidor');
  }

  return json;
}

const authApi = {
  async login(username, password) {
    return await apiRequest('auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  async logout() {
    return await apiRequest('auth/logout.php', { method: 'POST' });
  },
  async getMe() {
    return await apiRequest('auth/me.php', { method: 'GET' });
  }
};

window.apiRequest = apiRequest;
window.authApi = authApi;
