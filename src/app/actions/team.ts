"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createEphemeralClient } from "@/lib/supabase/ephemeral";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { readAccount } from "@/lib/validation";

export async function registerEmployee(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getCurrentUser();
  if (profile.role !== "admin") {
    return { error: "Only an admin can register an employee." };
  }

  const parsed = readAccount(formData, true);
  if ("error" in parsed) return parsed;

  if (parsed.email === profile.email) {
    return { error: "That email is already your admin account." };
  }

  const supabase = await createClient();
  const { data: invite, error: inviteError } = await supabase
    .from("gp_employee_invites")
    .insert({
      email: parsed.email,
      full_name: parsed.fullName,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (inviteError || !invite) {
    return { error: inviteError?.message ?? "Could not open a hire record." };
  }

  const signup = createEphemeralClient();
  const { data, error } = await signup.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      data: {
        role: "employee",
        full_name: parsed.fullName,
      },
    },
  });

  if (error || (data.user && (data.user.identities?.length ?? 0) === 0)) {
    await supabase.from("gp_employee_invites").delete().eq("id", invite.id);

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return {
        error:
          "That email already exists in this Supabase project, so it cannot be hired into GP Inventory.",
      };
    }

    return { error: error?.message ?? "Could not create that employee." };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");

  if (!data.session) {
    return {
      message: `${parsed.fullName} was added. They can sign in after confirming the email. If no message arrives, turn off Confirm email in this project's Auth settings and they can sign in directly.`,
    };
  }

  return {
    message: `${parsed.fullName} can sign in now with the email and password you set.`,
  };
}
