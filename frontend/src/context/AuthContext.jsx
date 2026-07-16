import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import api, { setBearerToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const { signIn: clerkSignIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp: clerkSignUp, setActive: setActiveSignUp } = useSignUp();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setBearerToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const token = await getToken();
        setBearerToken(token);

        const profile = await api.getProfile();
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || profile.email,
          ...profile,
        });
      } catch {
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          display_name:
            clerkUser.fullName ||
            clerkUser.username ||
            clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
            "",
          avatar_url: clerkUser.imageUrl || "",
        });
      } finally {
        setLoading(false);
      }
    };

    init();

    const interval = setInterval(async () => {
      try {
        const token = await getToken();
        setBearerToken(token);
      } catch { }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, clerkUser, getToken]);

  const signup = useCallback(
    async (email, password) => {
      if (!clerkSignUp || !setActiveSignUp)
        throw new Error("Sign up not available");

      const result = await clerkSignUp.create({
        emailAddress: email,
        password: password,
      });

      if (result.status !== "complete" && typeof result.prepareEmailAddressVerification === "function") {
        await result.prepareEmailAddressVerification({ strategy: "email_code" });
      }

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
      }

      return result;
    },
    [clerkSignUp, setActiveSignUp],
  );

  const signin = useCallback(
    async (email, password) => {
      if (!clerkSignIn || !setActiveSignIn)
        throw new Error("Sign in not available");

      const result = await clerkSignIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setActiveSignIn({ session: result.createdSessionId });
      }

      return result;
    },
    [clerkSignIn, setActiveSignIn],
  );

  const signout = useCallback(async () => {
    await clerkSignOut();
    setBearerToken(null);
    setUser(null);
  }, [clerkSignOut]);

  const verifySignupOtp = useCallback(
    async (code) => {
      if (!clerkSignUp || !setActiveSignUp)
        throw new Error("Sign up not available");

      const result = await clerkSignUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
      }

      return result;
    },
    [clerkSignUp, setActiveSignUp],
  );

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUser((prev) => ({ ...prev, ...profile }));
    } catch { }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading: loading || !isLoaded, signup, signin, signout, verifySignupOtp, refreshProfile }}
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
