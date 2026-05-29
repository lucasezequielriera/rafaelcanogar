import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { puedeEscribir } from "@/lib/permisos-logica";
import { requireLectura } from "@/lib/require-permiso";
import { PaginacionEnlaces } from "@/components/PaginacionEnlaces";
import { PAGE_SIZE_TABLAS, parsePageUnoBased, totalPaginas } from "@/lib/paginacion";

type Search = { [key: string]: string | string[] | undefined };

export default async function VentasPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sesion = await requireLectura("ventas");
  const puedeNuevaVenta = puedeEscribir(sesion.niveles, "ventas", sesion.isOwner);

  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const desde = typeof sp.desde === "string" ? sp.desde : "";
  const hasta = typeof sp.hasta === "string" ? sp.hasta : "";
  const rawPage = parsePageUnoBased(sp.page);

  let countQ = supabase.from("ventas").select("id", { count: "exact", head: true });
  if (desde) countQ = countQ.gte("fecha_venta", desde);
  if (hasta) countQ = countQ.lte("fecha_venta", hasta);
  if (q) {
    countQ = countQ.or(
      `comprador_nombre.ilike.%${q}%,galeria_intermediario.ilike.%${q}%,detalle.ilike.%${q}%,numero_factura.ilike.%${q}%`
    );
  }

  const { count: totalCount } = await countQ;
  const totalItems = totalCount ?? 0;
  const page = Math.min(rawPage, totalPaginas(totalItems, PAGE_SIZE_TABLAS));
  const from = (page - 1) * PAGE_SIZE_TABLAS;
  const to = from + PAGE_SIZE_TABLAS - 1;

  let dataQ = supabase.from("ventas").select("*, ejemplares(etiqueta, obras(numero_catalogo, nombre))");
  if (desde) dataQ = dataQ.gte("fecha_venta", desde);
  if (hasta) dataQ = dataQ.lte("fecha_venta", hasta);
  if (q) {
    dataQ = dataQ.or(
      `comprador_nombre.ilike.%${q}%,galeria_intermediario.ilike.%${q}%,detalle.ilike.%${q}%,numero_factura.ilike.%${q}%`
    );
  }

  const { data: ventas, error } = await dataQ.order("fecha_venta", { ascending: false }).range(from, to);

  type ObraEmb = { numero_catalogo: string; nombre: string };
  function obraUnica(o: unknown): ObraEmb | null {
    if (!o) return null;
    if (Array.isArray(o)) return (o[0] as ObraEmb | undefined) ?? null;
    return o as ObraEmb;
  }

  const preserveParams: Record<string, string | undefined> = {
    q: q || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Ventas</h1>
          <p className="mt-1 text-stone-600">Listado y búsqueda por comprador, galería o factura.</p>
        </div>
        {puedeNuevaVenta ? (
          <Link
            href="/ventas/nueva"
            className="rounded-xl bg-stone-900 px-5 py-3 text-lg font-medium text-white hover:bg-stone-800"
          >
            Nueva venta
          </Link>
        ) : null}
      </div>

      <section>
        <form className="mb-6 grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 md:grid-cols-4" method="get">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-medium">Buscar texto</span>
            <input name="q" defaultValue={q} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" placeholder="Comprador, galería…" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Desde</span>
            <input name="desde" type="date" defaultValue={desde} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Hasta</span>
            <input name="hasta" type="date" defaultValue={hasta} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
          </label>
          <div className="flex gap-2 md:col-span-4">
            <button type="submit" className="rounded-xl bg-stone-900 px-4 py-3 text-white">
              Aplicar filtros
            </button>
            <Link href="/ventas" className="rounded-xl border border-stone-300 px-4 py-3">
              Limpiar
            </Link>
          </div>
        </form>

        {error ? (
          <p className="text-red-800">{error.message}</p>
        ) : totalItems === 0 ? (
          <p className="text-stone-600">No hay ventas con estos criterios.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-base">
              <thead className="bg-stone-100 text-stone-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Obra</th>
                  <th className="px-4 py-3">Ejemplar</th>
                  <th className="px-4 py-3">Cant.</th>
                  <th className="px-4 py-3">Importe</th>
                  <th className="px-4 py-3">Comprador</th>
                  <th className="px-4 py-3">Galería</th>
                </tr>
              </thead>
              <tbody>
                {(ventas ?? []).map((v) => {
                  const ej = v.ejemplares as { etiqueta: string | null; obras: unknown } | null;
                  const obra = ej?.obras != null ? obraUnica(ej.obras) : null;
                  const obraTxt = obra ? `${obra.numero_catalogo} — ${obra.nombre}` : "—";
                  return (
                    <tr key={v.id} className="border-t border-stone-200">
                      <td className="px-4 py-3 whitespace-nowrap">{v.fecha_venta}</td>
                      <td className="px-4 py-3 max-w-xs">{obraTxt}</td>
                      <td className="px-4 py-3">{ej?.etiqueta ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{typeof v.cantidad === "number" ? v.cantidad : 1}</td>
                      <td className="px-4 py-3">
                        {v.importe != null ? `${Number(v.importe).toLocaleString("es-ES")} ${v.moneda}` : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-xs">{v.comprador_nombre ?? "—"}</td>
                      <td className="px-4 py-3 max-w-xs">{v.galeria_intermediario ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <PaginacionEnlaces pathname="/ventas" preserveParams={preserveParams} page={page} totalItems={totalItems} />
          </div>
        )}
      </section>
    </div>
  );
}
