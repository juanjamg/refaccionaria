// ==========================================
// API.JS - CLIENTE HTTP PARA LA API REST PHP
// ==========================================

const API_BASE = 'api';

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json || !json.success) {
    throw new Error((json && json.message) || 'Error de comunicación con el servidor');
  }

  return json;
}
