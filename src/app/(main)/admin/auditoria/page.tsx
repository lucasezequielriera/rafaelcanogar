import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireLectura } from "@/lib/require-permiso";

export default async function AuditoriaPage() {
  await requireLectura("auditoria");

  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, action, table_name, record_id, old_row, new_row")
    .order("occurred_at", { ascending: false })
    .limit(200);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let miNombre: string | undefined;
  if (user) {
    const { data: yo } = await supabase.from("profiles").select("nombre_completo").eq("id", user.id).maybeSingle();
    miNombre = yo?.nombre_completo ?? undefined;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Historial de cambios</h1>
      <p className="text-stone-600">
        Cada alta, baja o modificación en obras, ejemplares, ventas, archivos, permisos y perfiles queda registrada con usuario y
        fecha. Si el identificador del usuario no coincide con el suyo, es un compañero de equipo (el nombre completo solo es
        visible en la ficha de cada usuario para propietarios).
      </p>

      {error ? (
        <p className="text-red-800">
          {error.message} (¿tiene permiso de «Historial de cambios» en al menos lectura?)
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm md:text-base">
            <thead className="bg-stone-100">
              <tr>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Quién</th>
                <th className="px-3 py-3">Acción</th>
                <th className="px-3 py-3">Tabla</th>
                <th className="px-3 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-stone-200 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.occurred_at).toLocaleString("es-ES")}</td>
                  <td className="px-3 py-2">
                    {r.actor_id && user?.id && r.actor_id === user.id ? miNombre ?? "Usted" : r.actor_id ? `${r.actor_id.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2">{r.table_name}</td>
                  <td className="px-3 py-2 max-w-md break-words font-mono text-xs text-stone-700">
                    {r.action === "DELETE"
                      ? JSON.stringify(r.old_row)
                      : r.action === "INSERT"
                        ? JSON.stringify(r.new_row)
                        : "Δ " + JSON.stringify({ antes: r.old_row, despues: r.new_row })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
