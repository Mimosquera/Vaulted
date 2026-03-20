const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;

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

let refreshPromise = null;

function extractErrorMessage(payload, fallback = 'Request failed') {
  if (!payload) return fallback;

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  if (payload.error && typeof payload.error === 'object') {
    const message = typeof payload.error.message === 'string' ? payload.error.message.trim() : '';
    const details = typeof payload.error.details === 'string' ? payload.error.details.trim() : '';
    if (details) return details;
    if (message) return message;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  return fallback;
}

function shouldRetryGet(method, status, attempt) {
  return method === 'GET' && attempt < MAX_GET_RETRIES && status >= 500;
}

function withTimeout(fetchFn, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetchFn(controller.signal)
    .finally(() => clearTimeout(timeoutId));
}

async function request(path, options = {}, isRetry = false, attempt = 0) {
  const token = getToken();
  const method = (options.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await withTimeout((signal) => fetch(`${API_URL}${path}`, { ...options, headers, signal }));
  } catch (error) {
    if (method === 'GET' && attempt < MAX_GET_RETRIES) {
      return request(path, options, isRetry, attempt + 1);
    }

    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    throw new Error('Network error. Please check your connection and try again.');
  }

  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = withTimeout((signal) => fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        signal,
      })).then(async (refreshRes) => {
        if (!refreshRes.ok) throw new Error('Refresh failed');
        const data = await refreshRes.json();
        setToken(data.token);
        return data.token;
      }).finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      return request(path, options, true, attempt);
    } catch {
      setToken(null);
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired');
    }
  }

  if (shouldRetryGet(method, res.status, attempt)) {
    return request(path, options, isRetry, attempt + 1);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message = extractErrorMessage(payload, res.statusText || 'Request failed');
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──
export async function register(email, password, username) {
  const cleanedUsername = typeof username === 'string' ? username.trim() : '';
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      username: cleanedUsername || undefined,
    }),
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

export async function fetchCollectionsWithItems() {
  return request('/api/collections/full');
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

export async function setCollectionVisibilityAPI(id, visibility) {
  return request(`/api/collections/${id}/visibility`, {
    method: 'PUT',
    body: JSON.stringify({ visibility }),
  });
}

// ── Users / Friends ──
export async function searchUsersAPI(query) {
  return request(`/api/friends/search?q=${encodeURIComponent(query)}`);
}

export async function fetchFriendsAPI() {
  return request('/api/friends');
}

export async function sendFriendRequestAPI(userId) {
  return request('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function acceptFriendRequestAPI(id) {
  return request(`/api/friends/requests/${id}/accept`, { method: 'POST' });
}

export async function rejectFriendRequestAPI(id) {
  return request(`/api/friends/requests/${id}`, { method: 'DELETE' });
}

export async function removeFriendAPI(userId) {
  return request(`/api/friends/${userId}`, { method: 'DELETE' });
}

export async function fetchPublicProfileAPI(userId) {
  return request(`/api/users/${userId}/profile`);
}

export async function updateMyProfileAPI(payload) {
  return request('/api/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
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
export async function uploadImageAPI(file, onProgress) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('image', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response format'));
        }
      } else if (xhr.status === 401) {
        setToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
        reject(new Error('Unauthorized'));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || xhr.statusText));
        } catch {
          reject(new Error(xhr.statusText || 'Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_URL}/api/images`);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.send(formData);
  });
}

export function getImageUrl(id) {
  // If it's already a full URL (from cloud storage), return it directly
  if (id && (id.startsWith('http://') || id.startsWith('https://'))) {
    return id;
  }
  // Otherwise treat it as a local imageId and use API endpoint
  return `${API_URL}/api/images/${id}`;
}

export { getToken, setToken, API_URL };
