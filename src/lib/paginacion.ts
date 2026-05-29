/** Tamaño de página por defecto para listados en tablas. */
export const PAGE_SIZE_TABLAS = 25;

export function parsePageUnoBased(raw: string | string[] | undefined): number {
  const s = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function totalPaginas(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

/**
 * Serializa parámetros GET conservando filtros y la página (solo si es mayor que 1).
 */
export function queryStringPreservando(
  params: Record<string, string | undefined>,
  page: number,
  pageKey = "page"
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    if (k === pageKey) continue;
    u.set(k, v);
  }
  if (page > 1) u.set(pageKey, String(page));
  const qs = u.toString();
  return qs ? `?${qs}` : "";
}
