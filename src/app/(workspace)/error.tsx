"use client";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Something stalled</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">The catalog did not load.</h1>
      <p className="mt-3 text-sm leading-6 text-danger">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
