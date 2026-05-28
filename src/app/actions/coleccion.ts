"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function crearObra(_prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const numero_catalogo = str(formData, "numero_catalogo");
  const nombre = str(formData, "nombre");
  if (!numero_catalogo || !nombre) return { error: "Nº catálogo y nombre son obligatorios." };

  const { data, error } = await supabase
    .from("obras")
    .insert({
      numero_catalogo,
      nombre,
      anio: num(formData, "anio"),
      material: str(formData, "material"),
      tamano_text: str(formData, "tamano_text"),
      alto_cm: num(formData, "alto_cm"),
      ancho_cm: num(formData, "ancho_cm"),
      profundo_cm: num(formData, "profundo_cm"),
      edicion_text: str(formData, "edicion_text"),
      fundicion: str(formData, "fundicion"),
      precio_neto_estimado: num(formData, "precio_neto_estimado"),
      comentarios: str(formData, "comentarios"),
      descripcion: str(formData, "descripcion"),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/obras");
  redirect(`/obras/${data.id}`);
}

export async function actualizarObra(obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("obras")
    .update({
      nombre,
      anio: num(formData, "anio"),
      material: str(formData, "material"),
      tamano_text: str(formData, "tamano_text"),
      alto_cm: num(formData, "alto_cm"),
      ancho_cm: num(formData, "ancho_cm"),
      profundo_cm: num(formData, "profundo_cm"),
      edicion_text: str(formData, "edicion_text"),
      fundicion: str(formData, "fundicion"),
      precio_neto_estimado: num(formData, "precio_neto_estimado"),
      comentarios: str(formData, "comentarios"),
      descripcion: str(formData, "descripcion"),
    })
    .eq("id", obraId);

  if (error) return { error: error.message };
  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  return { ok: true };
}

export async function crearEjemplar(obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ejemplares").insert({
    obra_id: obraId,
    etiqueta: str(formData, "etiqueta"),
    notas: str(formData, "notas"),
  });
  if (error) return { error: error.message };
  revalidatePath(`/obras/${obraId}`);
  return { ok: true };
}

export async function registrarUbicacion(ejemplarId: string, obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const ubicacion = str(formData, "ubicacion");
  const fechaStr = str(formData, "fecha");
  if (!ubicacion || !fechaStr) return { error: "Ubicación y fecha son obligatorias." };

  const { error } = await supabase.from("ubicaciones_ejemplar").insert({
    ejemplar_id: ejemplarId,
    ubicacion,
    fecha: fechaStr,
  });
  if (error) return { error: error.message };
  revalidatePath(`/obras/${obraId}`);
  return { ok: true };
}

export async function subirArchivoObra(obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Seleccione un archivo." };

  const tipo = String(formData.get("archivo_tipo") || "imagen_obra");
  if (tipo !== "imagen_obra" && tipo !== "pdf") return { error: "Tipo de archivo no válido." };

  if (tipo === "imagen_obra") {
    const { count, error: cErr } = await supabase
      .from("archivos")
      .select("*", { count: "exact", head: true })
      .eq("obra_id", obraId)
      .eq("tipo", "imagen_obra");
    if (cErr) return { error: cErr.message };
    if ((count ?? 0) >= 5) return { error: "Ya hay 5 imágenes de la obra (máximo permitido)." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `obra/${obraId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from("media").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { error: insErr } = await supabase.from("archivos").insert({
    tipo: tipo as "imagen_obra" | "pdf",
    obra_id: obraId,
    ruta_storage: path,
    nombre_original: file.name,
    mime_type: file.type || null,
  });
  if (insErr) {
    await supabase.storage.from("media").remove([path]);
    return { error: insErr.message };
  }

  revalidatePath(`/obras/${obraId}`);
  return { ok: true };
}

export async function subirArchivoEjemplar(obraId: string, ejemplarId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Seleccione una imagen." };

  const { count, error: cErr } = await supabase
    .from("archivos")
    .select("*", { count: "exact", head: true })
    .eq("ejemplar_id", ejemplarId)
    .eq("tipo", "imagen_ejemplar");
  if (cErr) return { error: cErr.message };
  if ((count ?? 0) >= 5) return { error: "Máximo 5 imágenes por ejemplar." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `ejemplar/${ejemplarId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from("media").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { error: insErr } = await supabase.from("archivos").insert({
    tipo: "imagen_ejemplar",
    obra_id: obraId,
    ejemplar_id: ejemplarId,
    ruta_storage: path,
    nombre_original: file.name,
    mime_type: file.type || null,
  });
  if (insErr) {
    await supabase.storage.from("media").remove([path]);
    return { error: insErr.message };
  }

  revalidatePath(`/obras/${obraId}`);
  return { ok: true };
}

export async function crearVenta(_prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const ejemplarId = str(formData, "ejemplar_id");
  const fecha = str(formData, "fecha_venta");
  if (!ejemplarId || !fecha) return { error: "Ejemplar y fecha de venta son obligatorios." };

  const { error } = await supabase.from("ventas").insert({
    ejemplar_id: ejemplarId,
    fecha_venta: fecha,
    importe: num(formData, "importe"),
    moneda: str(formData, "moneda") ?? "EUR",
    comprador_nombre: str(formData, "comprador_nombre"),
    comprador_documento: str(formData, "comprador_documento"),
    comprador_email: str(formData, "comprador_email"),
    comprador_telefono: str(formData, "comprador_telefono"),
    comprador_direccion: str(formData, "comprador_direccion"),
    galeria_intermediario: str(formData, "galeria_intermediario"),
    numero_factura: str(formData, "numero_factura"),
    forma_pago: str(formData, "forma_pago"),
    notas_fiscales: str(formData, "notas_fiscales"),
    detalle: str(formData, "detalle"),
  });
  if (error) return { error: error.message };
  revalidatePath("/ventas");
  redirect("/ventas");
}
