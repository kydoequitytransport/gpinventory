import { readFile } from "node:fs/promises";
import path from "node:path";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthFallback, LoginForm, SetupForm } from "@/components/auth-forms";
import { Mark } from "@/components/mark";
import { ConnectionIssue, SchemaSetup } from "@/components/schema-setup";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="floor-grid floor-glow absolute inset-0" />
        <div className="relative flex items-center gap-3">
          <Mark />
          <div>
            <p className="text-sm font-medium tracking-wide">GP Inventory</p>
            <p className="text-[11px] tracking-[0.18em] text-[#b7b1a8] uppercase">
              Equipment
            </p>
          </div>
        </div>
        <div className="relative max-w-xl py-10 lg:py-0">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Built for the weight room.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#d5d8de]">
            Racks, plates, benches, and the people who sell them. Admins run the
            whole catalog. Employees work the floor they are cleared for.
          </p>
        </div>
        <div className="relative hidden gap-8 text-sm text-[#c9c1b6] lg:flex">
          <p>
            <span className="block text-[11px] tracking-[0.16em] text-[#8f877d] uppercase">
              Admin
            </span>
            Full catalog
          </p>
          <p>
            <span className="block text-[11px] tracking-[0.16em] text-[#8f877d] uppercase">
              Employee
            </span>
            Floor access
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <Suspense fallback={<AuthFallback />}>
          <LoginGate searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function LoginGate({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims?.sub) {
    redirect("/dashboard");
  }

  const { data: hasAdmin, error } = await supabase.rpc("gp_has_admin");

  if (error || typeof hasAdmin !== "boolean") {
    if (error && isMissingSchema(error.message, error.code)) {
      const sql = await readFile(
        path.join(process.cwd(), "supabase/migrations/001_gp_inventory.sql"),
        "utf8",
      );
      const ref = new URL(supabaseUrl()).hostname.split(".")[0];
      return (
        <SchemaSetup
          sql={sql}
          editorUrl={`https://supabase.com/dashboard/project/${ref}/sql/new`}
        />
      );
    }

    return (
      <ConnectionIssue
        message={error?.message ?? "The admin check did not return a result."}
      />
    );
  }

  if (!hasAdmin) return <SetupForm />;
  return <LoginForm notice={notice} />;
}

function isMissingSchema(message: string, code?: string) {
  const text = message.toLowerCase();
  return (
    code === "PGRST202" ||
    code === "42P01" ||
    text.includes("gp_has_admin") ||
    text.includes("schema cache") ||
    text.includes("does not exist")
  );
}
