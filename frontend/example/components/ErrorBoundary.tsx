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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-4">
              Error Occurred
            </h2>
            <div className="bg-black/30 rounded-lg p-4 mb-4 overflow-auto border border-white/10">
              <p className="text-slate-300 font-mono text-sm mb-2">
                {this.state.error?.toString()}
              </p>
              <pre className="text-slate-500 text-xs whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg 
                         hover:bg-blue-500/30 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
