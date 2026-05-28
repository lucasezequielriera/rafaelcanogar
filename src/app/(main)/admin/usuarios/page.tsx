import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InvitarUsuarioForm } from "./InvitarUsuarioForm";

export default async function AdminUsuariosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!prof?.is_owner) redirect("/obras");

  const { data: perfiles } = await supabase.from("profiles").select("id, nombre_completo, is_owner, created_at").order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Usuarios</h1>
        <p className="mt-2 text-stone-600">Solo propietarios pueden invitar y cambiar permisos del resto de cuentas.</p>
      </div>

      <InvitarUsuarioForm />

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Cuentas existentes</h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-base">
            <thead className="bg-stone-100">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Propietario</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Permisos</th>
              </tr>
            </thead>
            <tbody>
              {(perfiles ?? []).map((p) => (
                <tr key={p.id} className="border-t border-stone-200">
                  <td className="px-4 py-3">{p.nombre_completo ?? "—"}</td>
                  <td className="px-4 py-3">{p.is_owner ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.created_at?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.is_owner ? (
                      <span className="text-stone-500">—</span>
                    ) : (
                      <Link href={`/admin/usuarios/${p.id}`} className="font-medium text-amber-900 underline">
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
