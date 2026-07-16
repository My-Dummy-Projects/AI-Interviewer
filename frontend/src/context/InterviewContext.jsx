import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const [setup, setSetup] = useState(null);
  const [report, setReport] = useState(null);
  const transcriptRef = useRef([]);

  const setTranscript = useCallback((fn) => {
    transcriptRef.current = typeof fn === "function" ? fn(transcriptRef.current) : fn;
  }, []);

  const getTranscript = useCallback(() => transcriptRef.current, []);

  const reset = useCallback(() => {
    setSetup(null);
    setReport(null);
    transcriptRef.current = [];
  }, []);

  return (
    <InterviewContext.Provider
      value={{ setup, setSetup, report, setReport, reset, setTranscript, getTranscript }}
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
