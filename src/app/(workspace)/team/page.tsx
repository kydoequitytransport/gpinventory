import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { TeamPanel } from "@/components/team-panel";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata = {
  title: "Team",
};

export default function TeamPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <TeamContent />
    </Suspense>
  );
}

async function TeamContent() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gp_profiles")
    .select("id, email, full_name, role, created_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const people = (data ?? []).filter(isProfile);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Admin</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Team</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
        Register floor staff when you hire. They can sign in. They cannot open this
        page, and they cannot hire anyone else.
      </p>
      <div className="mt-10">
        <TeamPanel people={people} currentId={profile.id} />
      </div>
    </div>
  );
}

function isProfile(value: {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}): value is Profile {
  return value.role === "admin" || value.role === "employee";
}
