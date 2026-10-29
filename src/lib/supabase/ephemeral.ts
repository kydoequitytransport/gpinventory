import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/** Auth client that never touches the current user's cookies. */
export function createEphemeralClient() {
  return createClient(supabaseUrl(), supabaseKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
