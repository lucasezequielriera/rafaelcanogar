import { NIVELES, RECURSOS } from "@/lib/recursos";

type JsonRow = Record<string, unknown> | null;

const ACCION: Record<string, string> = {
  INSERT: "Alta",
  UPDATE: "Cambio",
  DELETE: "Baja",
};

const TABLA: Record<string, string> = {
  obras: "Obra",
  ejemplares: "Ejemplar",
  ubicaciones_ejemplar: "Ubicación / préstamo",
  ventas: "Venta",
  archivos: "Archivo",
  permisos_usuario: "Permiso de usuario",
  profiles: "Perfil de usuario",
  audit_log: "Historial",
};

const COL_OBRAS: Record<string, string> = {
  numero_catalogo: "Nº de catálogo",
  nombre: "Nombre",
  anio: "Año",
  material: "Material",
  tamano_text: "Medidas (texto)",
  alto_cm: "Alto (cm)",
  ancho_cm: "Ancho (cm)",
  profundo_cm: "Profundo (cm)",
  edicion_text: "Edición",
  fundicion: "Fundición",
  precio_neto_estimado: "Precio neto estimado",
  comentarios: "Comentarios",
  descripcion: "Descripción",
  unidades_totales: "Ejemplares previstos (edición)",
  unidades_disponibles: "Ejemplares aún disponibles",
};

const COL_EJEMPLARES: Record<string, string> = {
  obra_id: "Obra (identificador)",
  etiqueta: "Etiqueta",
  notas: "Notas",
};

const COL_UBIC: Record<string, string> = {
  ejemplar_id: "Ejemplar (identificador)",
  ubicacion: "Ubicación",
  fecha: "Fecha",
};

const COL_VENTAS: Record<string, string> = {
  ejemplar_id: "Ejemplar (identificador)",
  obra_id: "Obra (identificador)",
  fecha_venta: "Fecha de venta",
  importe: "Importe",
  moneda: "Moneda",
  comprador_nombre: "Comprador",
  comprador_documento: "Documento comprador",
  comprador_email: "Email comprador",
  comprador_telefono: "Teléfono comprador",
  comprador_direccion: "Dirección comprador",
  galeria_intermediario: "Galería / intermediario",
  numero_factura: "Nº factura",
  forma_pago: "Forma de pago",
  notas_fiscales: "Notas fiscales",
  detalle: "Detalle",
  cantidad: "Cantidad",
};

const COL_ARCHIVOS: Record<string, string> = {
  tipo: "Tipo",
  obra_id: "Obra (identificador)",
  ejemplar_id: "Ejemplar (identificador)",
  ruta_storage: "Ruta en almacenamiento",
  nombre_original: "Nombre del archivo",
  mime_type: "Tipo MIME",
  orden: "Orden",
};

const COL_PERMISOS: Record<string, string> = {
  user_id: "Usuario (identificador)",
  recurso: "Área",
  nivel: "Nivel de acceso",
};

const COL_PROFILES: Record<string, string> = {
  nombre_completo: "Nombre para mostrar",
  is_owner: "Propietario del sistema",
};

const TIPO_ARCHIVO: Record<string, string> = {
  imagen_obra: "Imagen de obra",
  imagen_ejemplar: "Imagen de ejemplar",
  pdf: "PDF",
};

function etiquetaColumna(table: string, col: string): string {
  const maps: Record<string, Record<string, string>> = {
    obras: COL_OBRAS,
    ejemplares: COL_EJEMPLARES,
    ubicaciones_ejemplar: COL_UBIC,
    ventas: COL_VENTAS,
    archivos: COL_ARCHIVOS,
    permisos_usuario: COL_PERMISOS,
    profiles: COL_PROFILES,
  };
  return maps[table]?.[col] ?? col.replace(/_/g, " ");
}

function valorLegible(table: string, col: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (col === "tipo" && table === "archivos" && typeof v === "string") {
    return TIPO_ARCHIVO[v] ?? v;
  }
  if (col === "recurso" && table === "permisos_usuario" && typeof v === "string") {
    const r = RECURSOS.find((x) => x.key === v);
    return r?.label ?? v;
  }
  if (col === "nivel" && table === "permisos_usuario" && typeof v === "string") {
    const n = NIVELES.find((x) => x.key === v);
    return n?.label ?? v;
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const META_KEYS = new Set(["id", "created_at", "updated_at"]);

function diffCambios(table: string, oldR: JsonRow, newR: JsonRow): string[] {
  if (!oldR || !newR) return [];
  const keys = new Set([...Object.keys(oldR), ...Object.keys(newR)]);
  const lineas: string[] = [];
  for (const k of keys) {
    if (META_KEYS.has(k)) continue;
    const a = oldR[k];
    const b = newR[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const label = etiquetaColumna(table, k);
    lineas.push(`${label}: de «${valorLegible(table, k, a)}» a «${valorLegible(table, k, b)}».`);
  }
  if (!lineas.length) return ["Se guardó el registro (sin cambios visibles en los datos mostrados)."];
  return lineas;
}

function obraTitulo(row: JsonRow): string {
  if (!row) return "";
  const n = row.nombre;
  const c = row.numero_catalogo;
  if (typeof n === "string" && n) {
    return typeof c === "string" && c ? `«${n}» (cat. ${c})` : `«${n}»`;
  }
  return typeof c === "string" && c ? `catálogo ${c}` : "obra";
}

function ejemplarTitulo(row: JsonRow): string {
  if (!row) return "ejemplar";
  const e = row.etiqueta;
  return typeof e === "string" && e ? `ejemplar «${e}»` : "un ejemplar";
}

export function accionAuditEs(action: string): string {
  return ACCION[action] ?? action;
}

export function nombreTablaAudit(table: string): string {
  return TABLA[table] ?? table.replace(/_/g, " ");
}

export function descripcionDetalleAudit(input: {
  table_name: string;
  action: string;
  old_row: JsonRow;
  new_row: JsonRow;
}): string {
  const { table_name: t, action, old_row, new_row } = input;

  try {
    if (t === "obras") {
      if (action === "INSERT" && new_row) {
        return `Se creó la obra ${obraTitulo(new_row)}.`;
      }
      if (action === "DELETE" && old_row) {
        return `Se eliminó la obra ${obraTitulo(old_row)}.`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        const d = diffCambios(t, old_row, new_row);
        return `Obra ${obraTitulo(new_row)}.\n${d.join("\n")}`;
      }
    }

    if (t === "ejemplares") {
      if (action === "INSERT" && new_row) {
        return `Se añadió ${ejemplarTitulo(new_row)}.`;
      }
      if (action === "DELETE" && old_row) {
        return `Se eliminó ${ejemplarTitulo(old_row)}.`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        return `Cambios en ${ejemplarTitulo(new_row)}.\n${diffCambios(t, old_row, new_row).join("\n")}`;
      }
    }

    if (t === "ubicaciones_ejemplar") {
      if (action === "INSERT" && new_row) {
        const u = new_row.ubicacion;
        const f = new_row.fecha;
        return `Se registró ubicación «${u ?? "?"}» con fecha ${f ?? "?"}.`;
      }
      if (action === "DELETE" && old_row) {
        return `Se eliminó el registro de ubicación «${old_row.ubicacion ?? "?"}» (${old_row.fecha ?? "?"}).`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        return `Cambio en ubicación/préstamo.\n${diffCambios(t, old_row, new_row).join("\n")}`;
      }
    }

    if (t === "ventas") {
      if (action === "INSERT" && new_row) {
        return `Se registró una venta (fecha ${new_row.fecha_venta ?? "?"}, cantidad ${new_row.cantidad ?? 1}, importe ${new_row.importe ?? "?"} ${new_row.moneda ?? ""}).`;
      }
      if (action === "DELETE" && old_row) {
        return `Se eliminó una venta del ${old_row.fecha_venta ?? "?"}.`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        return `Cambio en venta.\n${diffCambios(t, old_row, new_row).join("\n")}`;
      }
    }

    if (t === "archivos") {
      if (action === "INSERT" && new_row) {
        const nom = new_row.nombre_original ?? new_row.ruta_storage;
        return `Se subió un archivo (${valorLegible(t, "tipo", new_row.tipo)}): ${nom}.`;
      }
      if (action === "DELETE" && old_row) {
        return `Se eliminó el archivo «${old_row.nombre_original ?? old_row.ruta_storage}».`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        return `Cambio en archivo.\n${diffCambios(t, old_row, new_row).join("\n")}`;
      }
    }

    if (t === "permisos_usuario") {
      const recurso = new_row?.recurso ?? old_row?.recurso;
      const nivel = new_row?.nivel ?? old_row?.nivel;
      const rLabel = typeof recurso === "string" ? valorLegible(t, "recurso", recurso) : "?";
      const nLabel = typeof nivel === "string" ? valorLegible(t, "nivel", nivel) : "?";
      if (action === "INSERT" && new_row) {
        return `Se asignó permiso en el área «${rLabel}»: ${nLabel}.`;
      }
      if (action === "DELETE" && old_row) {
        return `Se quitó el permiso del área «${rLabel}» (antes: ${nLabel}).`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        return `Cambio de permisos.\n${diffCambios(t, old_row, new_row).join("\n")}`;
      }
    }

    if (t === "profiles") {
      if (action === "INSERT" && new_row) {
        const nom = new_row.nombre_completo ?? "sin nombre";
        const owner = new_row.is_owner === true;
        return `Se creó el perfil de usuario «${nom}»${owner ? " como propietario" : ""}.`;
      }
      if (action === "DELETE" && old_row) {
        return `Se eliminó el perfil de «${old_row.nombre_completo ?? "usuario"}».`;
      }
      if (action === "UPDATE" && old_row && new_row) {
        return `Cambio en perfil de usuario.\n${diffCambios(t, old_row, new_row).join("\n")}`;
      }
    }

    // Genérico
    if (action === "INSERT" && new_row) {
      return `Alta en ${nombreTablaAudit(t)}.`;
    }
    if (action === "DELETE" && old_row) {
      return `Baja en ${nombreTablaAudit(t)}.`;
    }
    if (action === "UPDATE" && old_row && new_row) {
      return `Cambios en ${nombreTablaAudit(t)}:\n${diffCambios(t, old_row, new_row).join("\n")}`;
    }
  } catch {
    /* continuar al fallback */
  }

  return "Registro auditado (detalle técnico no disponible en formato legible).";
}
