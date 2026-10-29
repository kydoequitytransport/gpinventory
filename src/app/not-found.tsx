import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">404</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Nothing on this rack.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          That address is not in the GP Inventory catalog.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center rounded-2xl bg-copper-deep px-5 text-sm text-white"
        >
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
