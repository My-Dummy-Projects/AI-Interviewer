import React, { createContext, useContext, useState, useCallback } from "react";

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const [setup, setSetup] = useState(null); // { jobRole, experienceLevel, durationMinutes }
  const [transcript, setTranscript] = useState([]); // [{ role, text, timestamp }]
  const [report, setReport] = useState(null);

  const reset = useCallback(() => {
    setSetup(null);
    setTranscript([]);
    setReport(null);
  }, []);

  return (
    <InterviewContext.Provider
      value={{ setup, setSetup, transcript, setTranscript, report, setReport, reset }}
    >
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error("useInterview must be used within InterviewProvider");
  return ctx;
}
