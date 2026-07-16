import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

let _bearerToken = null;

export function setBearerToken(token) {
  _bearerToken = token;
}

function authHeaders() {
  if (_bearerToken) {
    return { Authorization: `Bearer ${_bearerToken}` };
  }
  return {};
}

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

  // Feedback (with optional auth)
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
};

export default api;
