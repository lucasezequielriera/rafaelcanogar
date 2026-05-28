import { RECURSOS, type RecursoKey } from "@/lib/recursos";

export type NivelPermiso = "ninguno" | "lectura" | "lectura_escritura";

export function matrizPermisosVacia(): Record<RecursoKey, NivelPermiso> {
  const o = {} as Record<RecursoKey, NivelPermiso>;
  for (const r of RECURSOS) o[r.key] = "ninguno";
  return o;
}

export function puedeLeer(niveles: Record<RecursoKey, NivelPermiso>, recurso: RecursoKey, isOwner: boolean) {
  if (isOwner) return true;
  const n = niveles[recurso];
  return n === "lectura" || n === "lectura_escritura";
}

export function puedeEscribir(niveles: Record<RecursoKey, NivelPermiso>, recurso: RecursoKey, isOwner: boolean) {
  if (isOwner) return true;
  return niveles[recurso] === "lectura_escritura";
}

export function puedeImportarCsv(niveles: Record<RecursoKey, NivelPermiso>, isOwner: boolean) {
  return puedeEscribir(niveles, "importacion", isOwner);
}

export function hrefInicioPorPermisos(niveles: Record<RecursoKey, NivelPermiso>, isOwner: boolean): string {
  if (puedeLeer(niveles, "obras", isOwner)) return "/obras";
  if (puedeLeer(niveles, "ventas", isOwner)) return "/ventas";
  if (puedeImportarCsv(niveles, isOwner)) return "/importar";
  if (puedeLeer(niveles, "auditoria", isOwner)) return "/admin/auditoria";
  if (isOwner) return "/admin/usuarios";
  return "/sin-acceso";
}
