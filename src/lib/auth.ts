import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role, WorkspaceStats } from "@/lib/types";

export const getCurrentUser = cache(async (): Promise<Profile> => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("gp_profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || !isRole(profile.role)) {
    redirect("/auth/sign-out");
  }

  return profile;
});

export async function requireAdmin() {
  const profile = await getCurrentUser();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }
  return profile;
}

export async function getWorkspaceStats(): Promise<WorkspaceStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gp_workspace_stats");

  if (error || !data || typeof data !== "object") {
    return null;
  }

  const stats = data as Partial<WorkspaceStats>;
  if (typeof stats.people !== "number" || typeof stats.employees !== "number") {
    return null;
  }

  return { people: stats.people, employees: stats.employees };
}

function isRole(value: string): value is Role {
  return value === "admin" || value === "employee";
}
