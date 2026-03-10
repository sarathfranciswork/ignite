"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary that catches rendering errors in the component tree.
 * In production, shows a friendly UI. In development, shows error details.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // Send error to analytics endpoint for server-side collection
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [
            {
              event: "error_boundary_caught",
              properties: {
                message: error.message,
                componentStack: errorInfo.componentStack,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch(() => {
        // Silently fail - error reporting should not break the app
      });
    } else {
      // Development: log full details to console for debugging
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary] Caught error:", error);
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "1rem",
              maxWidth: "400px",
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          {process.env.NODE_ENV !== "production" && this.state.error && (
            <pre
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.375rem",
                padding: "1rem",
                marginBottom: "1rem",
                maxWidth: "600px",
                overflow: "auto",
                fontSize: "0.75rem",
                textAlign: "left",
              }}
            >
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            type="button"
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
