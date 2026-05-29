import { createBrowserClient } from "@supabase/ssr";

const MSG_ENV = `Configure Supabase en la carpeta del proyecto (SistemaCanogar):

1. Cree el archivo .env.local (junto a package.json).
2. Pegue NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY desde Supabase → Project Settings → API.
3. Detenga el servidor y ejecute de nuevo: npm run dev

(Sin esto la app no puede conectar con su base de datos.)`;

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const esPlaceholder = url.includes("placeholder.supabase.co") || url === "https://xxxx.supabase.co";

  if (!url || !anon || esPlaceholder) {
    throw new Error(MSG_ENV);
  }

  return createBrowserClient(url, anon);
}
