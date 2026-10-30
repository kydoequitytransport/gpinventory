import { signOut } from "@/app/actions/auth";
import { Mark } from "@/components/mark";
import { MobileNav } from "@/components/mobile-nav";
import { SideLink } from "@/components/side-link";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/format";

const links = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false, exact: false },
  { href: "/invoices", label: "Invoice", adminOnly: false, exact: false },
  { href: "/sales", label: "Sales report", adminOnly: false, exact: false },
] as const;

const productLinks = [
  { href: "/products", label: "List", exact: true },
  { href: "/products/categories", label: "Categories", exact: false },
] as const;

const inventoryLinks = [
  { href: "/inventory", label: "List", exact: true },
  { href: "/inventory/purchase-requests", label: "Purchase Request", exact: false },
] as const;

export async function Sidebar() {
  const profile = await getCurrentUser();
  const visible = links.filter((link) => !link.adminOnly || profile.role === "admin");

  return (
    <>
      <MobileNav fullName={profile.full_name} role={profile.role} />
      <aside className="sticky top-0 z-20 hidden h-screen flex-col justify-between bg-ink px-5 py-6 text-white md:flex">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3">
          <Mark />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-wide">GP Inventory</p>
            <p className="truncate text-[11px] tracking-[0.16em] text-[#b7b1a8] uppercase">
              Equipment
            </p>
          </div>
        </div>
        <nav className="mt-10 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] tracking-[0.18em] text-[#8f877d] uppercase">
            Workspace
          </p>
          {visible.map((link) => (
            <SideLink key={link.href} href={link.href} label={link.label} exact={link.exact} />
          ))}
          <p className="px-3 pt-5 pb-2 text-[11px] tracking-[0.18em] text-[#8f877d] uppercase">
            Products
          </p>
          <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2">
            {productLinks.map((link) => (
              <SideLink key={link.href} href={link.href} label={link.label} exact={link.exact} />
            ))}
          </div>
          <p className="px-3 pt-5 pb-2 text-[11px] tracking-[0.18em] text-[#8f877d] uppercase">
            Inventory
          </p>
          <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2">
            {inventoryLinks.map((link) => (
              <SideLink key={link.href} href={link.href} label={link.label} exact={link.exact} />
            ))}
          </div>
          {profile.role === "admin" ? (
            <div className="mt-1">
              <SideLink href="/team" label="Team" />
            </div>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 pt-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
          {initials(profile.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{profile.full_name}</p>
          <p
            className={`truncate text-xs ${
              profile.role === "admin" ? "text-[#ffb4b8]" : "text-[#c5ced8]"
            }`}
          >
            {profile.role === "admin" ? "Admin" : "Employee"}
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
    </aside>
    </>
  );
}

export function SidebarFallback() {
  return (
    <aside className="sticky top-0 z-20 h-[72px] bg-ink md:h-screen" aria-hidden />
  );
}
