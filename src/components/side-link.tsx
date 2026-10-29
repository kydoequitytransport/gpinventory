"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-white/10 text-white"
          : "text-[#c9c1b6] hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
