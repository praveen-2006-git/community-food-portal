import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorFallback({ error, resetErrorBoundary }) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="card-hairline p-8 my-8 max-w-lg mx-auto text-center space-y-4">
      <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-500">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-text-primary">Something went wrong</h3>
      <p className="text-xs text-text-secondary">
        An unexpected rendering error occurred in this section.
      </p>

      {isDev && error && (
        <details className="text-left p-3 rounded bg-surface border border-border text-[11px] font-mono text-amber-400 overflow-x-auto">
          <summary className="cursor-pointer font-bold mb-1">Error Details</summary>
          {error.message || String(error)}
        </details>
      )}

      <button
        onClick={resetErrorBoundary}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium text-text-primary bg-surface hover:bg-card border border-border rounded-lg transition focus-ring"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
