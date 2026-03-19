const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('vaulted-token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('vaulted-token', token);
  } else {
    localStorage.removeItem('vaulted-token');
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──
export async function register(email, password, username) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  });
  setToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export function logout() {
  setToken(null);
}

export async function refreshToken() {
  const data = await request('/auth/refresh', { method: 'POST' });
  setToken(data.token);
  return data;
}

// ── Collections ──
export async function fetchCollections() {
  return request('/api/collections');
}

export async function fetchPublicCollections() {
  return request('/api/collections/public');
}

export async function fetchPublicCollection(id) {
  return request(`/api/collections/public/${id}`);
}

export async function createCollectionAPI(collection) {
  return request('/api/collections', {
    method: 'POST',
    body: JSON.stringify(collection),
  });
}

export async function updateCollectionAPI(id, updates) {
  return request(`/api/collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCollectionAPI(id) {
  return request(`/api/collections/${id}`, { method: 'DELETE' });
}

export async function togglePublicAPI(id) {
  return request(`/api/collections/${id}/toggle-public`, { method: 'POST' });
}

// ── Items ──
export async function fetchItems(collectionId) {
  return request(`/api/collections/${collectionId}/items`);
}

export async function addItemAPI(collectionId, item) {
  return request(`/api/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateItemAPI(id, updates) {
  return request(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteItemAPI(id) {
  return request(`/api/items/${id}`, { method: 'DELETE' });
}

// ── Sync ──
export async function syncData(payload) {
  return request('/api/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Images ──
export async function uploadImageAPI(id, base64Data, mimeType) {
  return request('/api/images', {
    method: 'POST',
    body: JSON.stringify({ id, data: base64Data, mimeType }),
  });
}

export function getImageUrl(id) {
  return `${API_URL}/api/images/${id}`;
}

export { getToken, setToken, API_URL };
