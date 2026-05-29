"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function actualizarNombrePerfilDestino(userIdDestino: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: yo } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!yo?.is_owner) return { error: "Solo los propietarios pueden cambiar el nombre de otros usuarios." };

  const { data: dest } = await supabase.from("profiles").select("id").eq("id", userIdDestino).maybeSingle();
  if (!dest) return { error: "Usuario no encontrado." };

  const nombre = String(formData.get("nombre_completo") ?? "").trim();
  if (!nombre) return { error: "El nombre no puede estar vacío." };

  const { error } = await supabase.from("profiles").update({ nombre_completo: nombre }).eq("id", userIdDestino);
  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userIdDestino}`);
  revalidatePath("/admin/auditoria");
  return { ok: true as const };
}
