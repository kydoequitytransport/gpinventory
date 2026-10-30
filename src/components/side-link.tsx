"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideLink({
  href,
  label,
  exact = false,
  onClick,
}: {
  href: string;
  label: string;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
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
