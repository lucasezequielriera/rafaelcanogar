/**
 * Saldo de edición en `obras.unidades_disponibles` (no vendidos) menos piezas con estado «en préstamo»,
 * para reflejar en UI cuántas unidades siguen en colección / listas para operar.
 */
export function unidadesDisponiblesSinPrestamo(saldoDb: number | null | undefined, cantidadEnPrestamo: number): number {
  const d = Math.max(0, Number(saldoDb ?? 0));
  const p = Math.max(0, cantidadEnPrestamo);
  return Math.max(0, d - p);
}
