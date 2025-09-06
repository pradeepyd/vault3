'use client';

import { useEffect } from 'react';
import { errorHandler, ErrorFactory, ErrorCategory } from '@/lib/error-handling';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our error handling system
    const appError = ErrorFactory.security(
      error.message,
      {
        additionalData: {
          digest: error.digest,
          stack: error.stack,
          name: error.name
        }
      }
    );
    
    errorHandler.handleError(appError);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h1>
          
          <p className="text-gray-600 mb-6">
            We've encountered an unexpected error. Our team has been notified and is working to fix this issue.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
              <h3 className="text-sm font-medium text-red-800 mb-2">Development Error Details:</h3>
              <pre className="text-xs text-red-700 overflow-auto max-h-32">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
              {error.digest && (
                <p className="text-xs text-red-600 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 font-medium"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full text-gray-500 py-2 px-4 rounded-md hover:text-gray-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}