'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const stackLines = (this.state.error.stack || '').split('\n').slice(0, 3).join('\n');
      
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-3">
                页面出错
              </h2>
              <div className="text-red-600 text-sm mb-2">
                <strong>错误信息：</strong> {this.state.error.message}
              </div>
              <pre className="text-xs text-red-500 bg-red-100 p-3 rounded mt-2 overflow-auto whitespace-pre-wrap">
                {stackLines}
              </pre>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
