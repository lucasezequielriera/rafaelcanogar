/** Valores de `ejemplares.estado` en base de datos. */
export type EstadoEjemplarDb = "disponible" | "en_prestamo" | "vendido";

export const ETIQUETA_ESTADO_EJEMPLAR: Record<EstadoEjemplarDb, string> = {
  disponible: "En la colección",
  en_prestamo: "En préstamo",
  vendido: "Vendido",
};

export function etiquetaTipoMovimiento(t: string | null | undefined): string {
  switch (t) {
    case "prestamo":
      return "Préstamo";
    case "devolucion":
      return "Devolución a la colección";
    case "otro":
      return "Otro";
    default:
      return "Cambio de sitio";
  }
}
