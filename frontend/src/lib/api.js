/** Central HTTP client for the AI Interviewer backend.
 *
 * Wraps axios with a bearer-token mechanism (from Clerk), a deduplicated
 * 401-token-refresh interceptor, and typed helper methods for every
 * backend endpoint the frontend consumes.
 */
import axios from "axios";

const BACKEND_URL = (import.meta.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const API = `${BACKEND_URL}/api`;

let _bearerToken = null;
let _tokenRefresher = null;
let _refreshPromise = null;

/** Store the current bearer token to attach to authenticated requests. */
export function setBearerToken(token) {
  _bearerToken = token;
}

/** Register a function that returns a fresh token (provided by AuthContext). */
export function setTokenRefresher(fn) {
  _tokenRefresher = fn;
}

/** Get a fresh token, shared across concurrent callers.
 *
 * If multiple requests expire at once, only one refresh runs and every
 * caller awaits the same promise.
 */
export async function ensureFreshToken() {
  if (!_tokenRefresher) return _bearerToken;
  if (!_refreshPromise) {
    _refreshPromise = _tokenRefresher().finally(() => {
      _refreshPromise = null;
    });
  }
  const token = await _refreshPromise;
  if (token) {
    _bearerToken = token;
  }
  return token;
}

function authHeaders() {
  if (_bearerToken) {
    return { Authorization: `Bearer ${_bearerToken}` };
  }
  return {};
}

// Deduplicated token refresh: if ten requests fail 401 simultaneously, only
// one refresh call is made and all retry with the new token.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && _tokenRefresher && !error.config._retry) {
      error.config._retry = true;
      try {
        const token = await ensureFreshToken();
        if (token) {
          _bearerToken = token;
          error.config.headers.Authorization = `Bearer ${token}`;
          return axios(error.config);
        }
      } catch (e) {
        console.warn("Token refresh failed:", e);
      }
    }
    return Promise.reject(error);
  }
);

const api = {
  // Profile
  async getProfile() {
    const { data } = await axios.get(`${API}/user/profile`, {
      headers: authHeaders(),
    });
    return data;
  },
  async updateProfile(profile) {
    const { data } = await axios.put(`${API}/user/profile`, profile, {
      headers: authHeaders(),
    });
    return data;
  },

  // Dashboard
  async getDashboardStats() {
    const { data } = await axios.get(`${API}/user/dashboard-stats`, {
      headers: authHeaders(),
    });
    return data;
  },

  // Interviews
  async getInterviews() {
    const { data } = await axios.get(`${API}/user/interviews`, {
      headers: authHeaders(),
    });
    return data;
  },
  async getInterview(id) {
    const { data } = await axios.get(`${API}/user/interviews/${id}`, {
      headers: authHeaders(),
    });
    return data;
  },

  // Vapi config (public, no auth needed)
  async getConfig() {
    const { data } = await axios.get(`${API}/config`);
    return data;
  },

  // Interview feedback (transcript -> AI report)
  async submitFeedback(payload) {
    const { data } = await axios.post(`${API}/interview/feedback`, payload, {
      headers: authHeaders(),
      timeout: 90_000,
    });
    return data;
  },

  // Product feedback
  async submitToolFeedback(payload) {
    const { data } = await axios.post(`${API}/user/feedback`, payload, {
      headers: authHeaders(),
    });
    return data;
  },

  // Subscription
  async getSubscription() {
    const { data } = await axios.get(`${API}/user/subscription`, {
      headers: authHeaders(),
    });
    return data;
  },

  // Payments
  async createOrder(planId) {
    const { data } = await axios.post(
      `${API}/payments/create-order`,
      { planId },
      { headers: authHeaders() }
    );
    return data;
  },
  async verifyPayment(payload) {
    const { data } = await axios.post(
      `${API}/payments/verify-payment`,
      payload,
      { headers: authHeaders() }
    );
    return data;
  },

  // Auth sync
  async syncProfile() {
    const { data } = await axios.post(
      `${API}/user/sync-profile`,
      {},
      { headers: authHeaders() }
    );
    return data;
  },
};

export default api;