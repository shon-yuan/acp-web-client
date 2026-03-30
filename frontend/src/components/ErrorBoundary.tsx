'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-github-bg flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-github-surface border border-github-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-github-danger mb-4">
              An Error Occurred
            </h2>
            <div className="bg-github-bg rounded p-4 mb-4 overflow-auto">
              <p className="text-github-text font-mono text-sm mb-2">
                {this.state.error?.toString()}
              </p>
              <pre className="text-github-muted text-xs whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-github-accent text-white rounded hover:bg-github-accent-hover"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
