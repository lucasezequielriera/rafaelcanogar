import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificacionesStock } from "@/components/NotificacionesStock";
import type { InfoUltimaVenta, ObraAgotada } from "@/components/NotificacionesStock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMatrizPermisosMiUsuario, hrefInicioPorPermisos, puedeEscribir, puedeImportarCsv, puedeLeer } from "@/lib/permisos-server";
import type { RecursoKey } from "@/lib/recursos";

export const dynamic = "force-dynamic";

async function datosNotificacionesStock(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<{ agotadas: ObraAgotada[]; infoUltimaVenta: InfoUltimaVenta | null }> {
  const { data: agotadasRaw } = await supabase
    .from("obras")
    .select("id, numero_catalogo, nombre, unidades_totales, unidades_disponibles")
    .gt("unidades_totales", 0)
    .eq("unidades_disponibles", 0)
    .order("numero_catalogo", { ascending: true })
    .limit(20);

  const agotadas: ObraAgotada[] = (agotadasRaw ?? []).map((r) => ({
    id: r.id,
    numero_catalogo: String(r.numero_catalogo ?? ""),
    nombre: String(r.nombre ?? ""),
    unidades_totales: Number(r.unidades_totales ?? 0),
  }));
  const agotadaIds = new Set(agotadas.map((a) => a.id));

  const { data: ventasRecientes } = await supabase
    .from("ventas")
    .select("fecha_venta, obra_id, obras(id, numero_catalogo, nombre, unidades_totales, unidades_disponibles)")
    .not("obra_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);

  let infoUltimaVenta: InfoUltimaVenta | null = null;
  for (const v of ventasRecientes ?? []) {
    const oid = v.obra_id as string | null;
    if (!oid) continue;
    const raw = v.obras as unknown;
    const obr = Array.isArray(raw) ? raw[0] : raw;
    if (!obr || typeof obr !== "object") continue;
    const o = obr as Record<string, unknown>;
    const id = String(o.id ?? "");
    const tot = Number(o.unidades_totales ?? 0);
    const disp = Number(o.unidades_disponibles ?? 0);
    if (tot <= 0) continue;
    if (disp <= 0) continue;
    if (agotadaIds.has(id)) continue;
    infoUltimaVenta = {
      obraId: id,
      numero_catalogo: String(o.numero_catalogo ?? ""),
      nombre: String(o.nombre ?? ""),
      disponibles: disp,
      totales: tot,
      fecha_venta: String(v.fecha_venta ?? ""),
    };
    break;
  }

  return { agotadas, infoUltimaVenta };
}

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
  const navDashboard = niveles ? puedeEscribir(niveles, "ventas", isOwner) : false;
  const navImportar = niveles ? puedeImportarCsv(niveles, isOwner) : false;
  const navAuditoria = nav("auditoria");

  const stockNotif = nav("obras") ? await datosNotificacionesStock(supabase) : null;

  const hrefInicio = niveles ? hrefInicioPorPermisos(niveles, isOwner) : "/sin-acceso";

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      <header className="shrink-0 w-full border-b border-stone-200 bg-white">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href={hrefInicio}
            aria-label="Inicio"
            className="inline-flex min-w-0 max-w-full shrink-0 items-center"
          >
            <span className="relative h-10 w-[min(200px,42vw)] shrink-0 sm:h-11 sm:w-[min(240px,38vw)]">
              <Image
                src="/firma_transparente.png"
                alt="Rafael Canogar"
                fill
                className="object-contain object-left"
                sizes="(max-width: 640px) 42vw, 240px"
                priority
              />
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-lg">
            {navDashboard ? (
              <Link className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100" href="/dashboard">
                Dashboard
              </Link>
            ) : null}
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
            <span className="min-w-0 truncate">{profile?.nombre_completo ?? user.email}</span>
            {stockNotif ? <NotificacionesStock agotadas={stockNotif.agotadas} infoUltimaVenta={stockNotif.infoUltimaVenta} /> : null}
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg border border-stone-300 px-3 py-2 hover:bg-stone-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-8">{children}</main>
    </div>
  );
}
