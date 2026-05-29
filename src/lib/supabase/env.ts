/**
 * Lectura unificada de variables de entorno para Supabase.
 * Supabase admite claves legacy (JWT anon / service_role) y las nuevas
 * (publishable sb_publishable_… / secret sb_secret_…); los SDK las aceptan igual en createClient.
 */

export function getSupabaseProjectUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

/** Clave pública del cliente: anon (JWT) o publishable (sb_publishable_…). */
export function getSupabaseAnonOrPublishableKey(): string {
  const legacy = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (legacy) return legacy;
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}

/** Clave de servidor con privilegios elevados (invitar usuarios, etc.). */
export function getSupabaseServiceRoleOrSecretKey(): string {
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (legacy) return legacy;
  return process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
}
