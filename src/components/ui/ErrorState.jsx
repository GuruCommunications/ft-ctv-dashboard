import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <AlertTriangle className="w-10 h-10 text-[var(--color-accent)]" />
      <p className="text-[var(--color-text-muted)] text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      )}
    </div>
  );
}
