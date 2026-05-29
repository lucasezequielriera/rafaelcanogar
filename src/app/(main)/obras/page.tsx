import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { puedeEscribir } from "@/lib/permisos-logica";
import { requireLectura } from "@/lib/require-permiso";
import { PaginacionEnlaces } from "@/components/PaginacionEnlaces";
import { PAGE_SIZE_TABLAS, parsePageUnoBased, totalPaginas } from "@/lib/paginacion";
import { unidadesDisponiblesSinPrestamo } from "@/lib/obras-disponibles";
import { ObrasFilaAcciones } from "./ObrasFilaAcciones";

type Search = { [key: string]: string | string[] | undefined };

export default async function ObrasPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sesion = await requireLectura("obras");
  const puedeNuevaObra = puedeEscribir(sesion.niveles, "obras", sesion.isOwner);
  const puedePrestamoDesdeTabla = puedeEscribir(sesion.niveles, "ubicaciones_historial", sesion.isOwner);
  const puedeVentaDesdeTabla = puedeEscribir(sesion.niveles, "ventas", sesion.isOwner);
  const puedeBajaEjemplarDesdeTabla = puedeEscribir(sesion.niveles, "ejemplares", sesion.isOwner);

  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const anioMin = typeof sp.anio_min === "string" && sp.anio_min ? Number(sp.anio_min) : null;
  const anioMax = typeof sp.anio_max === "string" && sp.anio_max ? Number(sp.anio_max) : null;
  const altoMin = typeof sp.alto_min_cm === "string" && sp.alto_min_cm ? Number(sp.alto_min_cm) : null;
  const material = typeof sp.material === "string" ? sp.material.trim() : "";

  const rawPage = parsePageUnoBased(sp.page);

  let countQ = supabase.from("obras").select("id", { count: "exact", head: true });
  if (q) {
    countQ = countQ.or(`nombre.ilike.%${q}%,numero_catalogo.ilike.%${q}%,material.ilike.%${q}%`);
  }
  if (anioMin != null && Number.isFinite(anioMin)) countQ = countQ.gte("anio", anioMin);
  if (anioMax != null && Number.isFinite(anioMax)) countQ = countQ.lte("anio", anioMax);
  if (altoMin != null && Number.isFinite(altoMin)) countQ = countQ.gte("alto_cm", altoMin);
  if (material) countQ = countQ.ilike("material", `%${material}%`);

  const { count: totalCount } = await countQ;
  const totalItems = totalCount ?? 0;
  const page = Math.min(rawPage, totalPaginas(totalItems, PAGE_SIZE_TABLAS));
  const from = (page - 1) * PAGE_SIZE_TABLAS;
  const to = from + PAGE_SIZE_TABLAS - 1;

  let dataQ = supabase.from("obras").select("*");
  if (q) {
    dataQ = dataQ.or(`nombre.ilike.%${q}%,numero_catalogo.ilike.%${q}%,material.ilike.%${q}%`);
  }
  if (anioMin != null && Number.isFinite(anioMin)) dataQ = dataQ.gte("anio", anioMin);
  if (anioMax != null && Number.isFinite(anioMax)) dataQ = dataQ.lte("anio", anioMax);
  if (altoMin != null && Number.isFinite(altoMin)) dataQ = dataQ.gte("alto_cm", altoMin);
  if (material) dataQ = dataQ.ilike("material", `%${material}%`);

  const { data: obras, error } = await dataQ.order("numero_catalogo", { ascending: true }).range(from, to);

  const obraIds = (obras ?? []).map((o) => o.id);
  const prestamosPorObra = new Map<string, number>();
  if (obraIds.length > 0) {
    const { data: prestRows } = await supabase.from("ejemplares").select("obra_id").eq("estado", "en_prestamo").in("obra_id", obraIds);
    for (const r of prestRows ?? []) {
      const oid = String((r as { obra_id: string }).obra_id);
      prestamosPorObra.set(oid, (prestamosPorObra.get(oid) ?? 0) + 1);
    }
  }

  const preserveParams: Record<string, string | undefined> = {
    q: q || undefined,
    anio_min: typeof sp.anio_min === "string" && sp.anio_min ? sp.anio_min : undefined,
    anio_max: typeof sp.anio_max === "string" && sp.anio_max ? sp.anio_max : undefined,
    alto_min_cm: typeof sp.alto_min_cm === "string" && sp.alto_min_cm ? sp.alto_min_cm : undefined,
    material: material || undefined,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Obras</h1>
          <p className="mt-1 text-stone-600">
            Busque por nombre, nº de catálogo o material. Use altura mínima (en cm) para filtros como «más de 10 m» → 1000 cm.
          </p>
        </div>
        {puedeNuevaObra ? (
          <Link
            href="/obras/nueva"
            className="rounded-xl bg-stone-900 px-5 py-3 text-lg font-medium text-white hover:bg-stone-800"
          >
            Nueva obra
          </Link>
        ) : null}
      </div>

      <form className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-3" method="get">
        <label className="flex flex-col gap-2">
          <span className="font-medium text-stone-800">Texto</span>
          <input name="q" defaultValue={q} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" placeholder="Nombre, catálogo…" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium text-stone-800">Año desde</span>
          <input name="anio_min" type="number" defaultValue={anioMin ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium text-stone-800">Año hasta</span>
          <input name="anio_max" type="number" defaultValue={anioMax ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium text-stone-800">Altura mín. (cm)</span>
          <input
            name="alto_min_cm"
            type="number"
            defaultValue={altoMin ?? ""}
            className="rounded-lg border border-stone-300 px-3 py-2 text-lg"
            placeholder="1000 = 10 m"
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-medium text-stone-800">Material contiene</span>
          <input name="material" defaultValue={material} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" placeholder="Bronce…" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-xl bg-stone-800 px-4 py-3 text-lg text-white hover:bg-stone-700">
            Filtrar
          </button>
          <Link href="/obras" className="rounded-xl border border-stone-300 px-4 py-3 text-lg hover:bg-stone-50">
            Limpiar
          </Link>
        </div>
      </form>

      {error ? (
        <p className="rounded-lg bg-red-50 p-4 text-red-900">No se pudieron cargar las obras: {error.message}</p>
      ) : totalItems === 0 ? (
        <p className="text-stone-600">No hay obras que coincidan. Cree la primera o importe un CSV.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-base">
            <thead className="bg-stone-100 text-stone-800">
              <tr>
                <th className="px-4 py-3">Nº catálogo</th>
                <th className="px-4 py-3 min-w-[12rem]">Obra</th>
                <th className="px-4 py-3 whitespace-nowrap">Año</th>
                <th className="px-4 py-3 whitespace-nowrap">Precio neto (€)</th>
                <th className="px-4 py-3 whitespace-nowrap">Ejemplares (disp. / total)</th>
                <th className="px-3 py-3 text-right min-w-[14rem]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => {
                const tot = o.unidades_totales ?? 0;
                const nPrest = prestamosPorObra.get(o.id) ?? 0;
                const disp = unidadesDisponiblesSinPrestamo(o.unidades_disponibles, nPrest);
                return (
                  <tr key={o.id} className="border-t border-stone-200 hover:bg-stone-50/80">
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <Link href={`/obras/${o.id}`} className="font-medium text-stone-900 underline">
                        {o.numero_catalogo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/obras/${o.id}`} className="font-semibold text-stone-900 hover:underline">
                        {o.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-stone-800">{o.anio ?? "—"}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-stone-800">
                      {o.precio_neto_estimado != null ? Number(o.precio_neto_estimado).toLocaleString("es-ES") : "—"}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-stone-800">
                      {tot > 0 ? (
                        <>
                          {disp} / {tot}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                        {puedePrestamoDesdeTabla || puedeBajaEjemplarDesdeTabla ? (
                          <ObrasFilaAcciones
                            obraId={o.id}
                            numeroCatalogo={String(o.numero_catalogo)}
                            nombreObra={o.nombre}
                            puedePrestamo={puedePrestamoDesdeTabla}
                            puedeBaja={puedeBajaEjemplarDesdeTabla}
                          />
                        ) : null}
                        {puedeVentaDesdeTabla ? (
                          <Link
                            href={`/ventas/nueva?obra_id=${encodeURIComponent(o.id)}`}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-300/90 bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100"
                          >
                            Venta
                          </Link>
                        ) : null}
                        {!puedePrestamoDesdeTabla && !puedeVentaDesdeTabla && !puedeBajaEjemplarDesdeTabla ? (
                          <span className="text-sm text-stone-500">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginacionEnlaces pathname="/obras" preserveParams={preserveParams} page={page} totalItems={totalItems} />
        </div>
      )}
    </div>
  );
}
