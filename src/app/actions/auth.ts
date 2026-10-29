"use server";

import { redirect } from "next/navigation";
import { createEphemeralClient } from "@/lib/supabase/ephemeral";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { readAccount } from "@/lib/validation";

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = readAccount(formData, false);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Confirm this email before signing in. If no message arrives, turn off Confirm email in the Supabase Auth settings for this project.",
      };
    }
    return { error: "Email or password is incorrect." };
  }

  redirect("/dashboard");
}

export async function createAdmin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = readAccount(formData, true);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { data: hasAdmin, error: adminError } = await supabase.rpc("gp_has_admin");

  if (adminError) {
    return { error: "The GP Inventory tables are not ready yet." };
  }

  if (hasAdmin) {
    return { error: "An admin already exists. Sign in instead." };
  }

  const signup = createEphemeralClient();
  const { data, error } = await signup.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      data: {
        role: "admin",
        full_name: parsed.fullName,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("registration is closed")) {
      return { error: "An admin already exists. Sign in instead." };
    }
    return { error: error.message };
  }

  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      error:
        "That email already exists in this Supabase project, so it cannot become the GP Inventory admin.",
    };
  }

  if (!data.session) {
    return {
      message:
        "Admin account created. Confirm the email, then sign in. If nothing arrives, turn off Confirm email in this project's Auth settings and sign in with the password you just set.",
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (signInError) {
    return {
      message: "Admin account created. Sign in with that email and password.",
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
