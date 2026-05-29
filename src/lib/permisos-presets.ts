import { matrizPermisosVacia } from "@/lib/permisos-logica";
import type { RecursoKey } from "@/lib/recursos";

/** Misma forma que usa `PermisosTabla` (valores de nivel como string). */
export type PermisosMap = Record<RecursoKey, string>;

function base(): PermisosMap {
  return { ...matrizPermisosVacia() } as PermisosMap;
}

/** Empleado que solo consulta catálogo, ventas y archivos (sin tocar nada). */
export function presetEquipoSoloLectura(): PermisosMap {
  const v = base();
  for (const k of ["obras", "ejemplares", "ventas", "ubicaciones_historial", "archivos"] as const) {
    v[k] = "lectura";
  }
  return v;
}

/** Secretaría / gestión diaria: editar obras, ejemplares, ventas, ubicaciones y archivos. */
export function presetEquipoOperacion(): PermisosMap {
  const v = base();
  for (const k of ["obras", "ejemplares", "ventas", "ubicaciones_historial", "archivos"] as const) {
    v[k] = "lectura_escritura";
  }
  return v;
}

/** Igual que operación + importar CSV y ver historial de cambios (solo lectura). */
export function presetEquipoOperacionPlus(): PermisosMap {
  const v = presetEquipoOperacion();
  v.importacion = "lectura_escritura";
  v.auditoria = "lectura";
  return v;
}
