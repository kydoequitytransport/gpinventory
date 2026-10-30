"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Mark } from "@/components/mark";
import { SideLink } from "@/components/side-link";
import { initials } from "@/lib/format";

const links = [
  { href: "/dashboard", label: "Dashboard", exact: false },
  { href: "/invoices", label: "Invoice", exact: false },
] as const;

const productLinks = [
  { href: "/products", label: "List", exact: true },
  { href: "/products/categories", label: "Categories", exact: false },
] as const;

const inventoryLinks = [
  { href: "/inventory", label: "List", exact: true },
  { href: "/inventory/purchase-requests", label: "Purchase Request", exact: false },
] as const;

export function MobileNav({
  fullName,
  role,
}: {
  fullName: string;
  role: "admin" | "employee";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className="sticky top-0 z-30 md:hidden">
      <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <Mark />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-wide">GP Inventory</p>
            <p className="truncate text-[11px] tracking-[0.16em] text-[#b7b1a8] uppercase">
              Equipment
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
        >
          <MenuIcon open={open} />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 top-[68px] z-30">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/55"
            onClick={close}
          />
          <nav className="absolute inset-x-0 top-0 flex max-h-full flex-col overflow-y-auto bg-ink px-4 pt-3 pb-6 text-white shadow-[0_24px_40px_rgba(0,0,0,0.35)]">
            <p className="px-3 pb-2 text-[11px] tracking-[0.18em] text-[#8f877d] uppercase">
              Workspace
            </p>
            {links.map((link) => (
              <SideLink key={link.href} href={link.href} label={link.label} exact={link.exact} onClick={close} />
            ))}
            <p className="px-3 pt-5 pb-2 text-[11px] tracking-[0.18em] text-[#8f877d] uppercase">
              Products
            </p>
            <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2">
              {productLinks.map((link) => (
                <SideLink key={link.href} href={link.href} label={link.label} exact={link.exact} onClick={close} />
              ))}
            </div>
            <p className="px-3 pt-5 pb-2 text-[11px] tracking-[0.18em] text-[#8f877d] uppercase">
              Inventory
            </p>
            <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2">
              {inventoryLinks.map((link) => (
                <SideLink key={link.href} href={link.href} label={link.label} exact={link.exact} onClick={close} />
              ))}
            </div>
            {role === "admin" ? (
              <div className="mt-1">
                <SideLink href="/team" label="Team" onClick={close} />
              </div>
            ) : null}
            <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                {initials(fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{fullName}</p>
                <p className={`truncate text-xs ${role === "admin" ? "text-[#ffb4b8]" : "text-[#c5ced8]"}`}>
                  {role === "admin" ? "Admin" : "Employee"}
                </p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs text-[#d9cfc3] underline-offset-4 hover:text-white hover:underline"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
