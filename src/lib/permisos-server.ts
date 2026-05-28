import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RECURSOS, type RecursoKey } from "@/lib/recursos";
import { matrizPermisosVacia, type NivelPermiso } from "@/lib/permisos-logica";

export type { NivelPermiso } from "@/lib/permisos-logica";
export {
  hrefInicioPorPermisos,
  matrizPermisosVacia,
  puedeEscribir,
  puedeImportarCsv,
  puedeLeer,
} from "@/lib/permisos-logica";

/** Matriz de permisos para la sesión actual (propietarios = todo en escritura para la UI). */
export async function getMatrizPermisosMiUsuario() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perf } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  const isOwner = Boolean(perf?.is_owner);

  if (isOwner) {
    const todoEscritura = matrizPermisosVacia();
    for (const r of RECURSOS) todoEscritura[r.key] = "lectura_escritura";
    return { userId: user.id, isOwner: true, niveles: todoEscritura };
  }

  const { data: filas } = await supabase.from("permisos_usuario").select("recurso, nivel").eq("user_id", user.id);

  const niveles = matrizPermisosVacia();
  for (const f of filas ?? []) {
    const k = f.recurso as RecursoKey;
    if (k in niveles && f.nivel) niveles[k] = f.nivel as NivelPermiso;
  }

  return { userId: user.id, isOwner: false, niveles };
}
