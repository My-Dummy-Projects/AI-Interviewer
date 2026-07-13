import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let token, refreshToken;
    try {
      token = localStorage.getItem("voxa_access_token");
      refreshToken = localStorage.getItem("voxa_refresh_token");
    } catch {
      token = null;
      refreshToken = null;
    }

    const restore = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.getProfile();
        setUser({ ...profile, id: profile.user_id || token });
      } catch {
        if (refreshToken) {
          try {
            const data = await api.refreshToken(refreshToken);
            if (data.session?.access_token) {
              try {
                localStorage.setItem("voxa_access_token", data.session.access_token);
                localStorage.setItem("voxa_refresh_token", data.session.refresh_token || "");
              } catch { /* localStorage unavailable */ }
              const profile = await api.getProfile();
              setUser({ ...profile, id: profile.user_id || data.session.access_token });
              return;
            }
          } catch {
            // refresh failed
          }
        }
        try {
          localStorage.removeItem("voxa_access_token");
          localStorage.removeItem("voxa_refresh_token");
        } catch { /* localStorage unavailable */ }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const signup = useCallback(async (email, password) => {
    const data = await api.signup(email, password);
    if (data.session?.access_token) {
      try {
        localStorage.setItem("voxa_access_token", data.session.access_token);
        localStorage.setItem("voxa_refresh_token", data.session.refresh_token || "");
      } catch { /* localStorage unavailable */ }
      setUser({ ...data.user, id: data.user?.id || data.session.access_token });
    }
    return data;
  }, []);

  const signin = useCallback(async (email, password) => {
    const data = await api.signin(email, password);
    if (data.session?.access_token) {
      try {
        localStorage.setItem("voxa_access_token", data.session.access_token);
        localStorage.setItem("voxa_refresh_token", data.session.refresh_token || "");
      } catch { /* localStorage unavailable */ }
      setUser({ ...data.user, id: data.user?.id || data.session.access_token });
    }
    return data;
  }, []);

  const signout = useCallback(async () => {
    try {
      await api.signout();
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem("voxa_access_token");
      localStorage.removeItem("voxa_refresh_token");
    } catch { /* localStorage unavailable */ }
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUser((prev) => ({ ...prev, ...profile }));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, signin, signout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
