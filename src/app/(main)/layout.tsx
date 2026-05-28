import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMatrizPermisosMiUsuario, hrefInicioPorPermisos, puedeImportarCsv, puedeLeer } from "@/lib/permisos-server";
import type { RecursoKey } from "@/lib/recursos";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("nombre_completo, is_owner").eq("id", user.id).single();

  const matriz = await getMatrizPermisosMiUsuario();
  const isOwner = matriz?.isOwner ?? false;
  const niveles = matriz?.niveles;

  const nav = (recurso: RecursoKey) => (niveles ? puedeLeer(niveles, recurso, isOwner) : false);
  const navImportar = niveles ? puedeImportarCsv(niveles, isOwner) : false;
  const navAuditoria = nav("auditoria");

  const hrefInicio = niveles ? hrefInicioPorPermisos(niveles, isOwner) : "/sin-acceso";

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href={hrefInicio} className="text-xl font-semibold text-stone-900">
            Sistema Canogar
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-lg">
            {nav("obras") ? (
              <Link className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100" href="/obras">
                Obras
              </Link>
            ) : null}
            {nav("ventas") ? (
              <Link className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100" href="/ventas">
                Ventas
              </Link>
            ) : null}
            {navImportar ? (
              <Link className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100" href="/importar">
                Importar CSV
              </Link>
            ) : null}
            {profile?.is_owner ? (
              <Link className="rounded-lg px-3 py-2 text-amber-900 hover:bg-amber-50" href="/admin/usuarios">
                Usuarios
              </Link>
            ) : null}
            {navAuditoria ? (
              <Link className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100" href="/admin/auditoria">
                Historial
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3 text-base text-stone-600">
            <span>{profile?.nombre_completo ?? user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg border border-stone-300 px-3 py-2 hover:bg-stone-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
