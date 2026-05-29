import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonOrPublishableKey, getSupabaseProjectUrl } from "@/lib/supabase/env";

const MSG_ENV = `La app no tiene URL/clave válidas de Supabase en el entorno donde corre el navegador.

• Local: archivo .env.local en la carpeta del proyecto (junto a package.json) con:
  NEXT_PUBLIC_SUPABASE_URL
  y una de: NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT legacy) o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_…)
  Luego reinicie: npm run dev

• Vercel (o similar): en el proyecto → Settings → Environment Variables, añada esas variables para Production (y Preview si usa previews). IMPORTANTE: tras guardarlas, haga Redeploy (Deployments → … → Redeploy). Next.js las incluye en el build; un deploy anterior no las tiene.

Compruebe que la URL no sea el ejemplo (…xxxx…) ni contenga "placeholder". Copie Project URL y la clave publicable (o anon) desde Supabase → Project Settings → API.`;

function esValorDeEjemploOInvalido(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("placeholder.supabase.co")) return true;
  if (u.includes("xxxx.supabase.co")) return true;
  return false;
}

export function createSupabaseBrowserClient() {
  const url = getSupabaseProjectUrl();
  const anon = getSupabaseAnonOrPublishableKey();

  if (!url || !anon || esValorDeEjemploOInvalido(url)) {
    throw new Error(MSG_ENV);
  }

  return createBrowserClient(url, anon);
}
