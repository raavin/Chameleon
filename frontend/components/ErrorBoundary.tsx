import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-lg text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-3xl font-black text-slate-900">
              Something went wrong
            </h1>
            <p className="text-slate-600">
              The application encountered an unexpected error. This has been logged and we'll look into it.
            </p>
            {this.state.error && (
              <details className="text-left bg-slate-50 rounded-xl p-4 border border-slate-200">
                <summary className="text-sm font-bold text-slate-700 cursor-pointer">
                  Error Details
                </summary>
                <pre className="text-xs text-slate-600 mt-3 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
