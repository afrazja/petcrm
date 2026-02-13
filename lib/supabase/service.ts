import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service role client — bypasses RLS.
 * ONLY use in server-side API routes (app/api/).
 * NEVER import this in client components.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
