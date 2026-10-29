export function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-copper-deep text-sm font-semibold tracking-[0.12em] text-white ${className}`}
    >
      GP
    </span>
  );
}
