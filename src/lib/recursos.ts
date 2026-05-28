/** Recursos configurables por usuario (coinciden con enum recurso_sistema en Supabase) */
export const RECURSOS = [
  { key: "obras", label: "Obras" },
  { key: "ejemplares", label: "Ejemplares" },
  { key: "ventas", label: "Ventas" },
  { key: "ubicaciones_historial", label: "Ubicaciones / préstamos" },
  { key: "archivos", label: "Fotos y documentos" },
  { key: "importacion", label: "Importación CSV" },
  { key: "usuarios", label: "Usuarios y permisos" },
  { key: "auditoria", label: "Historial de cambios" },
] as const;

export type RecursoKey = (typeof RECURSOS)[number]["key"];

export const NIVELES = [
  { key: "ninguno", label: "Sin acceso" },
  { key: "lectura", label: "Ver" },
  { key: "lectura_escritura", label: "Ver y modificar" },
] as const;
