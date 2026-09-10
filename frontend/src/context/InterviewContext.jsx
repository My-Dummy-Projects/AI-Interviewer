/**
 * Global interview session state shared between pages.
 *
 * The interview flow spans SetupPage -> InterviewPage -> ReportPage. This
 * context carries the setup config and generated report between them so
 * each page can be re-entered (e.g. browser back) without losing state.
 */
import { createContext, useContext, useState, useCallback } from "react";

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const [setup, setSetup] = useState(null);
  const [report, setReport] = useState(null);

  /** Clear the current session so a fresh interview can begin. */
  const reset = useCallback(() => {
    setSetup(null);
    setReport(null);
  }, []);

  return (
    <InterviewContext.Provider
      value={{ setup, setSetup, report, setReport, reset }}
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