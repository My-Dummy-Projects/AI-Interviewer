import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import api, { setBearerToken, setTokenRefresher, ensureFreshToken } from "@/lib/api";
import { useProfileQuery, queryKeys } from "@/hooks/useApiQueries";
import { useQueryClient } from "@tanstack/react-query";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const { signIn: clerkSignIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp: clerkSignUp, setActive: setActiveSignUp } = useSignUp();
  const queryClient = useQueryClient();

  const [tokenReady, setTokenReady] = useState(false);
  const [user, setUser] = useState(null);

  const { data: profile, isError: profileError } = useProfileQuery(isSignedIn && tokenReady);

  useEffect(() => {
    if (!isLoaded) {
      setTokenReady(false);
      return;
    }
    if (!isSignedIn) {
      setBearerToken(null);
      setUser(null);
      setTokenReady(true);
      return;
    }
    const init = async () => {
      try {
        const token = await getToken();
        setBearerToken(token);
        setTokenReady(true);
      } catch {
        setTokenReady(true);
      }
    };
    init();
    setTokenRefresher(() => getToken);
    return () => setTokenRefresher(null);
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isSignedIn || !profile) return;
    setUser({
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || profile.email,
      ...profile,
    });
  }, [isSignedIn, profile, clerkUser]);

  useEffect(() => {
    if (!isSignedIn || !tokenReady || !profileError) return;
    setUser({
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      display_name: clerkUser.fullName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] || "",
      avatar_url: clerkUser.imageUrl || "",
    });
  }, [isSignedIn, tokenReady, profileError, clerkUser]);

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
        await setActiveSignUp({ session: result.createdSessionId, redirectUrl: "/dashboard" });
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
        await setActiveSignIn({ session: result.createdSessionId, redirectUrl: "/dashboard" });
      }

      return result;
    },
    [clerkSignIn, setActiveSignIn],
  );

  const signout = useCallback(async () => {
    await clerkSignOut();
    setBearerToken(null);
    setUser(null);
    queryClient.clear();
  }, [clerkSignOut, queryClient]);

  const verifySignupOtp = useCallback(
    async (code) => {
      if (!clerkSignUp || !setActiveSignUp)
        throw new Error("Sign up not available");

      const result = await clerkSignUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId, redirectUrl: "/dashboard" });
      }

      return result;
    },
    [clerkSignUp, setActiveSignUp],
  );

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  }, [queryClient]);

  const getFreshToken = useCallback(async () => {
    return ensureFreshToken();
  }, []);

  const value = {
    user,
    loading: !isLoaded || (isSignedIn && (!tokenReady || !user)),
    signup,
    signin,
    signout,
    verifySignupOtp,
    refreshProfile,
    getFreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
