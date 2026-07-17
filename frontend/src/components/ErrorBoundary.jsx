import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">!</div>
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-zinc-400 mb-6">An unexpected error occurred. Please reload the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-white hover:bg-zinc-200 text-black h-11 px-6 text-sm font-semibold transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GlobalErrorHandler() {
  React.useEffect(() => {
    const handler = (event) => {
      if (process.env.NODE_ENV === "development") {
        event.preventDefault();
        console.error("Unhandled error:", event.error || event.message);
      }
    };
    const rejectionHandler = (event) => {
      if (process.env.NODE_ENV === "development") {
        event.preventDefault();
        console.error("Unhandled promise rejection:", event.reason);
      }
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);
  return null;
}
