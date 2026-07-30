
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://ips-system-thf7.onrender.com/api';

const Api = {
  getToken() {
    return localStorage.getItem('pos_token');
  },

  setSession(userData) {
    localStorage.setItem('pos_token', userData.token);
    localStorage.setItem('pos_user', JSON.stringify({
      _id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    }));
  },

  getUser() {
    const raw = localStorage.getItem('pos_user');
    return raw ? JSON.parse(raw) : null;
  },

  clearSession() {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
  },

  async request(path, { method = 'GET', body, params } = {}) {
    let url = `${API_BASE_URL}${path}`;

    if (params) {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
      ).toString();
      if (query) url += `?${query}`;
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { success: false, message: 'Unexpected server response' };
    }

  if (response.status === 401 && !path.includes('/auth/login')) {
  this.clearSession();
  window.location.href = 'index.html?sessionExpired=1';
  throw new Error('Session expired');
}

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  },

  get(path, params) { return this.request(path, { method: 'GET', params }); },
  post(path, body) { return this.request(path, { method: 'POST', body }); },
  put(path, body) { return this.request(path, { method: 'PUT', body }); },
  del(path) { return this.request(path, { method: 'DELETE' }); },
};

// Money formatting helper - Nigerian Naira
function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);
}

// Toast helper (Bootstrap 5 toast)
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer') || (() => {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    c.style.zIndex = 1080;
    document.body.appendChild(c);
    return c;
  })();

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} border-0`;
  toastEl.role = 'alert';
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}
