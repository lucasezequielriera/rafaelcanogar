import { createSupabaseServerClient } from "@/lib/supabase/server";
import { accionAuditEs, descripcionDetalleAudit, nombreTablaAudit } from "@/lib/auditoria-descripcion";
import { requireLectura } from "@/lib/require-permiso";
import { AuditoriaTablaCliente, type FilaAuditoriaUi } from "./AuditoriaTablaCliente";

export default async function AuditoriaPage() {
  await requireLectura("auditoria");

  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, action, table_name, record_id, old_row, new_row")
    .order("occurred_at", { ascending: false })
    .limit(200);

  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter((id): id is string => Boolean(id)))];
  const nombresActor: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actores } = await supabase.from("profiles").select("id, nombre_completo").in("id", actorIds);
    for (const a of actores ?? []) {
      const n = a.nombre_completo?.trim();
      nombresActor[a.id] = n && n.length > 0 ? n : "Usuario sin nombre";
    }
  }

  const filas: FilaAuditoriaUi[] = (rows ?? []).map((r) => {
    const quien = r.actor_id ? (nombresActor[r.actor_id] ?? "Usuario del equipo") : "—";
    const accion = accionAuditEs(r.action);
    const tipo = nombreTablaAudit(r.table_name);
    const detalle = descripcionDetalleAudit({
      table_name: r.table_name,
      action: r.action,
      old_row: r.old_row as Record<string, unknown> | null,
      new_row: r.new_row as Record<string, unknown> | null,
    });
    const fechaTexto = new Date(r.occurred_at).toLocaleString("es-ES");
    const indiceBusqueda = [fechaTexto, quien, accion, tipo, detalle, r.table_name, r.action].join(" ").toLowerCase();

    return {
      id: r.id,
      occurred_at: r.occurred_at,
      actor_id: r.actor_id,
      fechaTexto,
      quien,
      accion,
      tipo,
      detalle,
      indiceBusqueda,
    };
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Historial de cambios</h1>
        <p className="text-stone-600">
          Registro de altas, bajas y modificaciones en obras, ejemplares, ventas, archivos, permisos y perfiles. Busque por cualquier fragmento de texto (incluye el detalle) o filtre por
          usuario. La tabla muestra los últimos 200 movimientos.
        </p>
        <p className="text-red-800">
          {error.message} (¿tiene permiso de «Historial de cambios» en al menos lectura?)
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold">Historial de cambios</h1>
        <p className="mt-2 text-stone-600">
          Registro de altas, bajas y modificaciones en obras, ejemplares, ventas, archivos, permisos y perfiles. Busque por cualquier fragmento de texto (incluye el detalle) o filtre por
          usuario. La tabla muestra los últimos 200 movimientos.
        </p>
      </div>

      <AuditoriaTablaCliente filas={filas} className="min-h-0 flex-1" />
    </div>
  );
}
