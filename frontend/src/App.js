import React, { lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { ErrorBoundary, GlobalErrorHandler } from "@/components/ErrorBoundary";
import { Toaster } from "sonner";
import { InterviewProvider } from "@/context/InterviewContext";
import { AuthProvider } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const SetupPage = lazy(() => import("@/pages/SetupPage"));
const InterviewPage = lazy(() => import("@/pages/InterviewPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const FeedbackPage = lazy(() => import("@/pages/FeedbackPage"));

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || "";

function App() {
  return (
    <div className="App">
      <GlobalErrorHandler />
      <ClerkProvider
        publishableKey={clerkPubKey}
        afterSignUpUrl="/dashboard"
        afterSignInUrl="/dashboard"
        signInUrl="/signin"
        signUpUrl="/signup"
      >
        <AuthProvider>
          <InterviewProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<LoadingScreen message="Loading..." />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/setup" element={<SetupPage />} />
                    <Route path="/interview" element={<InterviewPage />} />
                    <Route path="/report" element={<ReportPage />} />
                    <Route path="/report/:id" element={<ReportPage />} />
                    <Route path="/signin" element={<SignInPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
            <Toaster
              position="top-right"
              theme="dark"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "rgba(15, 15, 15, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#fafafa",
                },
              }}
            />
          </InterviewProvider>
        </AuthProvider>
      </ClerkProvider>
    </div>
  );
}

export default App;
