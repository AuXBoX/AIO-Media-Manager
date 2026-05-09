import React, { Component, ReactNode } from 'react';
import { AppError, classifyError, logError } from '@/utils/errorHandling';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * ErrorBoundary Component
 * 
 * React error boundary to catch rendering errors and display fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = classifyError(error);
    return {
      hasError: true,
      error: appError,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const appError = classifyError(error);
    logError(appError, { componentStack: errorInfo.componentStack });

    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            </div>

            <p className="text-gray-600 mb-4">{this.state.error.message}</p>

            {this.state.error.recoverable && (
              <button
                onClick={this.reset}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
            )}

            {process.env['NODE_ENV'] === 'development' && this.state.error.details && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(this.state.error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
