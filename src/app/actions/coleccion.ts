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

/** Entero >= 0 para unidades; vacío → defaultVal (acepta "0") */
function intUnidades(formData: FormData, key: string, defaultVal: number): number {
  const v = formData.get(key);
  if (v == null || v === "") return defaultVal;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultVal;
}

function intCantidadVenta(formData: FormData): number {
  const v = formData.get("cantidad");
  if (v == null || v === "") return 1;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function crearObra(_prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const numero_catalogo = str(formData, "numero_catalogo");
  const nombre = str(formData, "nombre");
  if (!numero_catalogo || !nombre) return { error: "Nº catálogo y nombre son obligatorios." };

  const unidades_totales = intUnidades(formData, "unidades_totales", 0);
  const unidades_disponibles = unidades_totales;

  if (unidades_totales > 0) {
    for (let i = 0; i < unidades_totales; i++) {
      const etiqueta = str(formData, `ejemplar_${i}_etiqueta`);
      const ubicacion = str(formData, `ejemplar_${i}_ubicacion`);
      if (!etiqueta) return { error: `Ejemplar ${i + 1}: la etiqueta es obligatoria.` };
      if (!ubicacion) return { error: `Ejemplar ${i + 1}: la ubicación es obligatoria.` };
    }
  }

  const { data, error } = await supabase
    .from("obras")
    .insert({
      numero_catalogo,
      nombre,
      unidades_totales,
      unidades_disponibles,
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

  const obraId = data.id;

  if (unidades_totales > 0) {
    for (let i = 0; i < unidades_totales; i++) {
      const etiqueta = str(formData, `ejemplar_${i}_etiqueta`)!;
      const notas = str(formData, `ejemplar_${i}_notas`);
      const ubicacion = str(formData, `ejemplar_${i}_ubicacion`)!;
      const fechaStr = str(formData, `ejemplar_${i}_fecha`) || new Date().toISOString().slice(0, 10);

      const { data: ej, error: eErr } = await supabase.from("ejemplares").insert({ obra_id: obraId, etiqueta, notas }).select("id").single();
      if (eErr || !ej) {
        await supabase.from("obras").delete().eq("id", obraId);
        return { error: eErr?.message ?? "No se pudo crear el ejemplar." };
      }
      const { error: uErr } = await supabase.from("ubicaciones_ejemplar").insert({
        ejemplar_id: ej.id,
        ubicacion: ubicacion.trim(),
        fecha: fechaStr,
      });
      if (uErr) {
        await supabase.from("obras").delete().eq("id", obraId);
        return { error: uErr.message };
      }
    }
  }

  revalidatePath("/obras");
  redirect(`/obras/${obraId}`);
}

export async function actualizarObra(obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio." };

  const unidades_totales_new = intUnidades(formData, "unidades_totales", 0);

  const { data: ejemplarRowsAsc, error: ejErr } = await supabase
    .from("ejemplares")
    .select("id")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: true });
  if (ejErr) return { error: `No se pudieron leer los ejemplares de la obra: ${ejErr.message}` };
  const existingList = ejemplarRowsAsc ?? [];
  const ejIds = existingList.map((r) => r.id);

  if (unidades_totales_new < existingList.length) {
    return {
      error: `Hay ${existingList.length} ejemplares dados de alta; el número de la edición no puede ser inferior. Aumente el cupo o elimine ejemplares si corresponde.`,
    };
  }

  if (unidades_totales_new > 0) {
    for (let i = 0; i < unidades_totales_new; i++) {
      const etiqueta = str(formData, `ejemplar_${i}_etiqueta`);
      if (!etiqueta) return { error: `Ejemplar ${i + 1}: la etiqueta es obligatoria.` };
      const ubicacion = str(formData, `ejemplar_${i}_ubicacion`);
      if (i >= existingList.length && !ubicacion) {
        return { error: `Ejemplar ${i + 1}: la ubicación inicial es obligatoria.` };
      }
    }
  }

  async function ubicacionMasReciente(ejemplarId: string): Promise<string | null> {
    const { data } = await supabase
      .from("ubicaciones_ejemplar")
      .select("ubicacion")
      .eq("ejemplar_id", ejemplarId)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();
    const u = data?.ubicacion;
    if (u == null || typeof u !== "string") return null;
    const t = u.trim();
    return t === "" ? null : t;
  }

  const { data: ventasPorObra, error: errVObra } = await supabase.from("ventas").select("id, cantidad").eq("obra_id", obraId);
  if (errVObra) return { error: `No se pudieron leer las ventas de la obra: ${errVObra.message}` };

  const { data: ventasPorEjemplar, error: errVEj } =
    ejIds.length > 0
      ? await supabase.from("ventas").select("id, cantidad").in("ejemplar_id", ejIds)
      : { data: [] as { id: string; cantidad: number | null }[], error: null };
  if (errVEj) return { error: `No se pudieron leer las ventas por ejemplar: ${errVEj.message}` };

  const cantidadPorVenta = new Map<string, number>();
  for (const r of [...(ventasPorObra ?? []), ...(ventasPorEjemplar ?? [])]) {
    const id = String(r.id ?? "");
    if (!id) continue;
    const c = typeof r.cantidad === "number" && r.cantidad > 0 ? r.cantidad : 1;
    cantidadPorVenta.set(id, c);
  }
  const vendidas = [...cantidadPorVenta.values()].reduce((acc, c) => acc + c, 0);

  let unidades_disponibles = 0;
  if (unidades_totales_new > 0) {
    if (unidades_totales_new < vendidas) {
      return {
        error: `El número de ejemplares de la edición no puede ser inferior a los ya vendidos (${vendidas}).`,
      };
    }
    unidades_disponibles = unidades_totales_new - vendidas;
  }

  const { data: updatedRows, error } = await supabase
    .from("obras")
    .update({
      nombre,
      unidades_totales: unidades_totales_new,
      unidades_disponibles,
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
    .eq("id", obraId)
    .select("id");

  if (error) return { error: error.message };
  if (!updatedRows?.length) {
    return {
      error:
        "No se guardó ningún cambio (la base no devolvió fila actualizada). Compruebe permiso de escritura en «Obras» o recargue la página.",
    };
  }

  if (unidades_totales_new > 0) {
    for (let i = 0; i < unidades_totales_new; i++) {
      const etiqueta = str(formData, `ejemplar_${i}_etiqueta`)!;
      const notas = str(formData, `ejemplar_${i}_notas`);
      const ubicacionRaw = str(formData, `ejemplar_${i}_ubicacion`);
      const fechaStr = str(formData, `ejemplar_${i}_fecha`) || new Date().toISOString().slice(0, 10);

      if (i < existingList.length) {
        const id = existingList[i].id;
        const { error: upEjErr } = await supabase.from("ejemplares").update({ etiqueta, notas }).eq("id", id);
        if (upEjErr) return { error: upEjErr.message };
        if (ubicacionRaw) {
          const trimmed = ubicacionRaw.trim();
          const ult = await ubicacionMasReciente(id);
          if (ult !== trimmed) {
            const { error: insUErr } = await supabase.from("ubicaciones_ejemplar").insert({
              ejemplar_id: id,
              ubicacion: trimmed,
              fecha: fechaStr,
            });
            if (insUErr) return { error: insUErr.message };
          }
        }
      } else {
        const trimmedUbi = (ubicacionRaw ?? "").trim();
        if (!trimmedUbi) return { error: `Ejemplar ${i + 1}: la ubicación inicial es obligatoria.` };
        const { data: nej, error: insEErr } = await supabase
          .from("ejemplares")
          .insert({ obra_id: obraId, etiqueta, notas })
          .select("id")
          .single();
        if (insEErr || !nej) return { error: insEErr?.message ?? "No se pudo crear el ejemplar." };
        const { error: insUErr } = await supabase.from("ubicaciones_ejemplar").insert({
          ejemplar_id: nej.id,
          ubicacion: trimmedUbi,
          fecha: fechaStr,
        });
        if (insUErr) return { error: insUErr.message };
      }
    }
  }

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
  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  return { ok: true };
}

/** Baja física de un ejemplar (rotura, destrucción, etc.). No permitido si hay ventas o la pieza consta como vendida. */
export async function eliminarEjemplarPorRompimiento(ejemplarId: string, obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (formData.get("confirmo_baja") !== "si") {
    return { error: "Debe marcar la casilla de confirmación para dar de baja la pieza." };
  }

  const { data: ej, error: eRead } = await supabase.from("ejemplares").select("id, obra_id").eq("id", ejemplarId).maybeSingle();
  if (eRead) return { error: eRead.message };
  if (!ej) return { error: "No se encontró el ejemplar." };
  if (ej.obra_id !== obraId) return { error: "El ejemplar no pertenece a esta obra." };

  const { data: ventas, error: vErr } = await supabase.from("ventas").select("id").eq("ejemplar_id", ejemplarId).limit(1);
  if (vErr) return { error: vErr.message };
  if ((ventas ?? []).length > 0) {
    return { error: "No se puede dar de baja: existen ventas asociadas a esta pieza." };
  }

  const { error: dErr } = await supabase.from("ejemplares").delete().eq("id", ejemplarId);
  if (dErr) return { error: dErr.message };

  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/ventas/nueva");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Listado de ejemplares de una obra (para modales en la tabla de obras). */
export async function listarEjemplaresParaObra(
  obraId: string,
): Promise<{ ejemplares: { id: string; etiqueta: string | null }[] } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ejemplares")
    .select("id, etiqueta")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return { ejemplares: data ?? [] };
}

/** Baja desde la tabla: descripción obligatoria; imágenes opcionales (se guardan como imágenes de la obra, prefijo [Baja]). */
export async function registrarBajaDesdeListadoObra(obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const ejemplarId = str(formData, "ejemplar_id");
  const descripcion = str(formData, "descripcion");
  if (!ejemplarId) return { error: "Seleccione un ejemplar." };
  if (!descripcion) return { error: "La descripción es obligatoria." };

  const { data: ej, error: eRead } = await supabase.from("ejemplares").select("id, obra_id, etiqueta").eq("id", ejemplarId).maybeSingle();
  if (eRead) return { error: eRead.message };
  if (!ej) return { error: "No se encontró el ejemplar." };
  if (ej.obra_id !== obraId) return { error: "El ejemplar no pertenece a esta obra." };

  const { data: ventas, error: vErr } = await supabase.from("ventas").select("id").eq("ejemplar_id", ejemplarId).limit(1);
  if (vErr) return { error: vErr.message };
  if ((ventas ?? []).length > 0) {
    return { error: "No se puede dar de baja: existen ventas asociadas a esta pieza." };
  }

  const etiqueta = (ej.etiqueta ?? "sin etiqueta").slice(0, 120);
  const nombreBase = `[Baja ${etiqueta}] ${descripcion.slice(0, 100)}`;

  const archivosLista = formData.getAll("evidencias");
  let nImg = 0;
  for (const item of archivosLista) {
    if (!(item instanceof File) || item.size === 0) continue;
    if (!item.type.startsWith("image/")) {
      return { error: "Las evidencias deben ser imágenes (JPEG, PNG, etc.)." };
    }
    const { count, error: cErr } = await supabase
      .from("archivos")
      .select("*", { count: "exact", head: true })
      .eq("obra_id", obraId)
      .eq("tipo", "imagen_obra");
    if (cErr) return { error: cErr.message };
    if ((count ?? 0) >= 5) {
      return { error: "La obra ya tiene 5 imágenes (límite). No se pueden subir más evidencias sin borrar otras antes." };
    }

    const ext = item.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `obra/${obraId}/baja-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const buf = Buffer.from(await item.arrayBuffer());
    const { error: upErr } = await supabase.storage.from("media").upload(path, buf, {
      contentType: item.type || "image/jpeg",
      upsert: false,
    });
    if (upErr) return { error: upErr.message };

    const { error: insErr } = await supabase.from("archivos").insert({
      tipo: "imagen_obra" as const,
      obra_id: obraId,
      ruta_storage: path,
      nombre_original: `${nombreBase} — ${item.name}`.slice(0, 240),
      mime_type: item.type || null,
    });
    if (insErr) {
      await supabase.storage.from("media").remove([path]);
      return { error: insErr.message };
    }
    nImg += 1;
    if (nImg > 5) return { error: "Máximo 5 imágenes por esta baja." };
  }

  const { error: dErr } = await supabase.from("ejemplares").delete().eq("id", ejemplarId);
  if (dErr) return { error: dErr.message };

  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/ventas/nueva");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Préstamo desde la tabla: una anotación de ubicación con el detalle del préstamo. */
export async function registrarPrestamoDesdeListadoObra(obraId: string, _prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const ejemplarId = str(formData, "ejemplar_id");
  const fechaStr = str(formData, "fecha");
  const dondePieza = str(formData, "donde_esta_pieza");
  const prestatario = str(formData, "prestatario_nombre");
  const email = str(formData, "prestatario_email");
  const telefono = str(formData, "prestatario_telefono");
  const ubicacionSeguimiento = str(formData, "ubicacion_seguimiento");
  const notas = str(formData, "notas_prestamo");

  if (!ejemplarId) return { error: "Seleccione un ejemplar." };
  if (!fechaStr) return { error: "Indique la fecha." };
  if (!dondePieza) return { error: "Indique dónde está la pieza (situación actual)." };
  if (!prestatario) return { error: "Indique a quién se presta la pieza." };
  if (!email) return { error: "El email de contacto es obligatorio." };
  if (!telefono) return { error: "El teléfono es obligatorio." };
  if (!ubicacionSeguimiento) return { error: "Indique ubicación o datos para localizar al prestatario o la pieza." };

  const { data: ej, error: eRead } = await supabase.from("ejemplares").select("id, obra_id").eq("id", ejemplarId).maybeSingle();
  if (eRead) return { error: eRead.message };
  if (!ej) return { error: "No se encontró el ejemplar." };
  if (ej.obra_id !== obraId) return { error: "El ejemplar no pertenece a esta obra." };

  const bloque = [
    "[Préstamo — registro desde listado de obras]",
    `Pieza en: ${dondePieza}`,
    `Prestado a: ${prestatario}`,
    `Email: ${email}`,
    `Teléfono: ${telefono}`,
    `Datos para localizar / seguimiento: ${ubicacionSeguimiento}`,
    notas ? `Notas: ${notas}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase.from("ubicaciones_ejemplar").insert({
    ejemplar_id: ejemplarId,
    ubicacion: bloque,
    fecha: fechaStr,
    /** Dispara el trigger que pone el ejemplar en «en_prestamo» (no ocurre con el default «cambio_sitio»). */
    tipo_movimiento: "prestamo",
  });
  if (error) return { error: error.message };

  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
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

  const { data: ejRow, error: ejErr } = await supabase.from("ejemplares").select("obra_id").eq("id", ejemplarId).maybeSingle();
  if (ejErr) return { error: ejErr.message };
  const obraId = ejRow?.obra_id as string | null | undefined;
  if (!obraId) return { error: "No se pudo determinar la obra del ejemplar." };

  const cantidad = intCantidadVenta(formData);

  const { error } = await supabase.from("ventas").insert({
    ejemplar_id: ejemplarId,
    fecha_venta: fecha,
    cantidad,
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
  revalidatePath("/ventas/nueva");
  revalidatePath("/dashboard");
  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  redirect(`/obras/${obraId}?venta_registrada=1`);
}
