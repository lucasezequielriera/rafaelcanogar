"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RECURSOS, type RecursoKey } from "@/lib/recursos";

export async function guardarPermisosUsuario(userIdDestino: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: yo } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!yo?.is_owner) return { error: "Solo los propietarios pueden cambiar permisos." };

  const { data: dest } = await supabase.from("profiles").select("is_owner").eq("id", userIdDestino).maybeSingle();
  if (!dest) return { error: "Usuario no encontrado." };
  if (dest.is_owner) {
    return { error: "Los propietarios tienen acceso total; no hace falta ni se permite editar permisos por filas." };
  }

  const filas: { user_id: string; recurso: RecursoKey; nivel: string }[] = [];
  for (const r of RECURSOS) {
    const nivel = String(formData.get(`perm_${r.key}`) ?? "ninguno");
    if (nivel !== "ninguno" && nivel !== "lectura" && nivel !== "lectura_escritura") {
      return { error: `Nivel inválido para ${r.label}.` };
    }
    if (nivel !== "ninguno") {
      filas.push({ user_id: userIdDestino, recurso: r.key, nivel });
    }
  }

  const { error: delErr } = await supabase.from("permisos_usuario").delete().eq("user_id", userIdDestino);
  if (delErr) return { error: delErr.message };

  if (filas.length) {
    const { error: insErr } = await supabase.from("permisos_usuario").insert(filas);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userIdDestino}`);
  revalidatePath("/admin/auditoria");
  return { ok: true as const };
}
