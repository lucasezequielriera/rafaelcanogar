import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl, getSupabaseServiceRoleOrSecretKey } from "@/lib/supabase/env";

/** Cliente con privilegios elevados (solo servidor). Devuelve null si falta la clave en entorno. */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = getSupabaseProjectUrl();
  const key = getSupabaseServiceRoleOrSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
