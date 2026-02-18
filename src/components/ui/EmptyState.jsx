import { Database } from 'lucide-react';

export default function EmptyState({ message = 'No data available' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
      <Database className="w-8 h-8 text-[var(--color-text-muted)]" />
      <p className="text-[var(--color-text-muted)] text-sm">{message}</p>
    </div>
  );
}
