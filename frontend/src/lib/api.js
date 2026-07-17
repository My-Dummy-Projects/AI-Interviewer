import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

let _bearerToken = null;
let _tokenRefresher = null;

export function setBearerToken(token) {
  _bearerToken = token;
}

export function setTokenRefresher(fn) {
  _tokenRefresher = fn;
}

function authHeaders() {
  if (_bearerToken) {
    return { Authorization: `Bearer ${_bearerToken}` };
  }
  return {};
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && _tokenRefresher && !error.config._retry) {
      error.config._retry = true;
      try {
        const token = await _tokenRefresher();
        if (token) {
          _bearerToken = token;
          error.config.headers.Authorization = `Bearer ${token}`;
          return axios(error.config);
        }
      } catch {}
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

  // Config
  async getConfig() {
    const { data } = await axios.get(`${API}/config`);
    return data;
  },

  // Interview
  async getPlanConfig() {
    const { data } = await axios.get(`${API}/interview/plan-config`, {
      headers: authHeaders(),
    });
    return data;
  },

  async validateSetup(payload) {
    const { data } = await axios.post(`${API}/interview/validate-setup`, payload, {
      headers: authHeaders(),
    });
    return data;
  },

  async submitFeedback(payload) {
    const { data } = await axios.post(`${API}/interview/feedback`, payload, {
      headers: authHeaders(),
      timeout: 90_000,
    });
    return data;
  },

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
  async getPaymentConfig() {
    const { data } = await axios.get(`${API}/payments/config`, {
      headers: authHeaders(),
    });
    return data;
  },

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
};

export default api;
