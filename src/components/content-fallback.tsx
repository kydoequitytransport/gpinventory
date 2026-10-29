export function ContentFallback() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="h-3 w-36 rounded-full bg-paper-deep" />
      <div className="mt-4 h-10 w-64 max-w-full rounded-2xl bg-paper-deep" />
      <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-paper-deep" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.8fr)]">
        <div className="h-80 rounded-[28px] bg-white/80" />
        <div className="grid gap-6">
          <div className="h-40 rounded-[28px] bg-white/80" />
          <div className="h-40 rounded-[28px] bg-white/80" />
        </div>
      </div>
    </div>
  );
}
