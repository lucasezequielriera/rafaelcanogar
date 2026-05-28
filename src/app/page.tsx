import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMatrizPermisosMiUsuario, hrefInicioPorPermisos } from "@/lib/permisos-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const matriz = await getMatrizPermisosMiUsuario();
  if (!matriz) redirect("/login");

  redirect(hrefInicioPorPermisos(matriz.niveles, matriz.isOwner));
}
