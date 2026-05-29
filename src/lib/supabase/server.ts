import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonOrPublishableKey, getSupabaseProjectUrl } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const url = getSupabaseProjectUrl() || "https://placeholder.supabase.co";
  const anon =
    getSupabaseAnonOrPublishableKey() || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid";

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* set desde Server Component de solo lectura */
        }
      },
    },
  });
}
