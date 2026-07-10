import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { InterviewProvider } from "@/context/InterviewContext";
import LandingPage from "@/pages/LandingPage";
import SetupPage from "@/pages/SetupPage";
import InterviewPage from "@/pages/InterviewPage";
import ReportPage from "@/pages/ReportPage";

function App() {
  return (
    <div className="App">
      <InterviewProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
    </div>
  );
}

export default App;
