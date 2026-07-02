import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { InterviewProvider } from "@/context/InterviewContext";
import SetupPage from "@/pages/SetupPage";
import InterviewPage from "@/pages/InterviewPage";
import ReportPage from "@/pages/ReportPage";

function App() {
  return (
    <div className="App">
      <InterviewProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SetupPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </InterviewProvider>
    </div>
  );
}

export default App;
