import { redirect } from "next/navigation";
import { puedeEscribir, puedeImportarCsv, puedeLeer } from "@/lib/permisos-logica";
import type { RecursoKey } from "@/lib/recursos";
import { getMatrizPermisosMiUsuario } from "@/lib/permisos-server";

export type SesionPermisos = NonNullable<Awaited<ReturnType<typeof getMatrizPermisosMiUsuario>>>;

/** Redirige a /sin-acceso si no hay permiso de lectura en ese recurso (los propietarios pasan siempre). */
export async function requireLectura(recurso: RecursoKey): Promise<SesionPermisos> {
  const m = await getMatrizPermisosMiUsuario();
  if (!m) redirect("/login");
  if (!puedeLeer(m.niveles, recurso, m.isOwner)) redirect("/sin-acceso");
  return m;
}

export async function requireEscritura(recurso: RecursoKey): Promise<SesionPermisos> {
  const m = await getMatrizPermisosMiUsuario();
  if (!m) redirect("/login");
  if (!puedeEscribir(m.niveles, recurso, m.isOwner)) redirect("/sin-acceso");
  return m;
}

export async function requireImportarCsv(): Promise<SesionPermisos> {
  const m = await getMatrizPermisosMiUsuario();
  if (!m) redirect("/login");
  if (!puedeImportarCsv(m.niveles, m.isOwner)) redirect("/sin-acceso");
  return m;
}
