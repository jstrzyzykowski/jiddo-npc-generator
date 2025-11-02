interface SpinnerProps {
  label?: string;
}

export function Spinner({ label }: SpinnerProps) {
  const message = label ?? "Finalizing sign in...";

  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <span className="sr-only">{message}</span>
      <div className="relative inline-flex size-14 items-center justify-center">
        <div className="absolute inline-flex size-full animate-spin rounded-full border-4 border-muted/40 border-t-primary" />
        <div className="inline-flex size-6 rounded-full bg-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
