"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function pick(row: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function numStr(s: string | null): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function importarCsv(_prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada. Vuelva a entrar." };

  const { data: prof } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  let puede = Boolean(prof?.is_owner);
  if (!puede) {
    const { data: perm } = await supabase
      .from("permisos_usuario")
      .select("nivel")
      .eq("user_id", user.id)
      .eq("recurso", "importacion")
      .maybeSingle();
    puede = perm?.nivel === "lectura_escritura";
  }
  if (!puede) {
    return { error: "No tiene permiso para importar (propietarios o permiso «Importación» en escritura)." };
  }

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Seleccione un archivo CSV." };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    return { error: `CSV con errores de formato: ${parsed.errors[0].message}` };
  }

  let ok = 0;
  let errMsg: string | null = null;

  for (const row of parsed.data) {
    const numero_catalogo = pick(row, ["numero_catalogo", "Nº Cat.", "Nº cat", "catalogo", "numero catalogo"]);
    const nombre = pick(row, ["nombre", "Nombre", "titulo"]);
    if (!numero_catalogo || !nombre) continue;

    const payload = {
      numero_catalogo,
      nombre,
      anio: numStr(pick(row, ["anio", "Año", "ano"])),
      material: pick(row, ["material", "Material"]),
      tamano_text: pick(row, ["tamano_text", "Tamaño", "tamano", "medidas"]),
      alto_cm: numStr(pick(row, ["alto_cm", "alto cm"])),
      ancho_cm: numStr(pick(row, ["ancho_cm", "ancho cm"])),
      profundo_cm: numStr(pick(row, ["profundo_cm", "profundo cm"])),
      edicion_text: pick(row, ["edicion_text", "Edición", "edicion"]),
      fundicion: pick(row, ["fundicion", "Fundición"]),
      precio_neto_estimado: numStr(pick(row, ["precio_neto_estimado", "Precio €", "precio", "Precio"])),
      comentarios: pick(row, ["comentarios", "COMENTARIOS", "Comentarios"]),
      descripcion: pick(row, ["descripcion", "Descripción"]),
    };

    const { error } = await supabase.from("obras").upsert(payload, { onConflict: "numero_catalogo" });
    if (error) {
      errMsg = error.message;
      break;
    }
    ok++;
  }

  if (errMsg) return { error: errMsg, imported: ok };
  revalidatePath("/obras");
  return { ok: true, imported: ok };
}
