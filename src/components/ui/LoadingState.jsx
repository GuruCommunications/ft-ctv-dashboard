export default function LoadingState({ message = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[var(--color-primary)] animate-spin" />
      </div>
      <p className="text-[var(--color-text-muted)] text-sm">{message}</p>
    </div>
  );
}
