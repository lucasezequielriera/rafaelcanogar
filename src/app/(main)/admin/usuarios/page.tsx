import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PaginacionEnlaces } from "@/components/PaginacionEnlaces";
import { PAGE_SIZE_TABLAS, parsePageUnoBased, totalPaginas } from "@/lib/paginacion";
import { InvitarUsuarioForm } from "./InvitarUsuarioForm";
import { UsuariosFilaAcciones } from "./UsuariosFilaAcciones";

type Search = { [key: string]: string | string[] | undefined };

export default async function AdminUsuariosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!prof?.is_owner) redirect("/obras");

  const sp = await searchParams;
  const rawPage = parsePageUnoBased(sp.page);

  const { count: totalCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  const totalItems = totalCount ?? 0;
  const page = Math.min(rawPage, totalPaginas(totalItems, PAGE_SIZE_TABLAS));
  const from = (page - 1) * PAGE_SIZE_TABLAS;
  const to = from + PAGE_SIZE_TABLAS - 1;

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre_completo, is_owner, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Usuarios</h1>
        <p className="mt-2 text-stone-600">
          Solo los <strong>propietarios</strong> ven este apartado. Puede dar de alta a otros propietarios o cuentas de <strong>equipo</strong>{" "}
          (secretaría, empleados) con permisos por área: solo ver o ver y modificar.
        </p>
      </div>

      <InvitarUsuarioForm />

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Cuentas existentes</h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-base">
            <thead className="bg-stone-100">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(perfiles ?? []).map((p) => (
                <tr key={p.id} className="border-t border-stone-200">
                  <td className="px-4 py-3">{p.nombre_completo ?? "—"}</td>
                  <td className="px-4 py-3">{p.is_owner ? "Propietario" : "Equipo"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.created_at?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <UsuariosFilaAcciones
                      userId={p.id}
                      nombre={p.nombre_completo}
                      isOwner={p.is_owner}
                      currentUserId={user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginacionEnlaces pathname="/admin/usuarios" preserveParams={{}} page={page} totalItems={totalItems} />
        </div>
        <p className="mt-2 text-sm text-stone-500">
          No puede eliminar su propia cuenta desde esta lista. Use el botón <strong>Salir</strong> y pida a otro propietario que la elimine si hace falta.
        </p>
      </section>
    </div>
  );
}
