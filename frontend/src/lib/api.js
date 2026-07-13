import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

function authHeaders() {
  const token = localStorage.getItem("voxa_access_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

const api = {
  // Auth
  async signup(email, password) {
    const { data } = await axios.post(`${API}/auth/signup`, { email, password });
    return data;
  },
  async signin(email, password) {
    const { data } = await axios.post(`${API}/auth/signin`, { email, password });
    return data;
  },
  async signout() {
    const { data } = await axios.post(`${API}/auth/signout`, {}, { headers: authHeaders() });
    return data;
  },
  async resetPassword(email) {
    const { data } = await axios.post(`${API}/auth/reset-password`, { email });
    return data;
  },
  // Profile
  async getProfile() {
    const { data } = await axios.get(`${API}/user/profile`, { headers: authHeaders() });
    return data;
  },
  async updateProfile(profile) {
    const { data } = await axios.put(`${API}/user/profile`, profile, { headers: authHeaders() });
    return data;
  },

  // Dashboard
  async getDashboardStats() {
    const { data } = await axios.get(`${API}/user/dashboard-stats`, { headers: authHeaders() });
    return data;
  },

  // Interviews
  async getInterviews() {
    const { data } = await axios.get(`${API}/user/interviews`, { headers: authHeaders() });
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
};

export default api;
