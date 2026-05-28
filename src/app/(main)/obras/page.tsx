import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { puedeEscribir } from "@/lib/permisos-logica";
import { requireLectura } from "@/lib/require-permiso";

type Search = { [key: string]: string | string[] | undefined };

export default async function ObrasPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sesion = await requireLectura("obras");
  const puedeNuevaObra = puedeEscribir(sesion.niveles, "obras", sesion.isOwner);

  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const anioMin = typeof sp.anio_min === "string" && sp.anio_min ? Number(sp.anio_min) : null;
  const anioMax = typeof sp.anio_max === "string" && sp.anio_max ? Number(sp.anio_max) : null;
  const altoMin = typeof sp.alto_min_cm === "string" && sp.alto_min_cm ? Number(sp.alto_min_cm) : null;
  const material = typeof sp.material === "string" ? sp.material.trim() : "";

  let query = supabase.from("obras").select("*").order("numero_catalogo", { ascending: true });

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,numero_catalogo.ilike.%${q}%,material.ilike.%${q}%`);
  }
  if (anioMin != null && Number.isFinite(anioMin)) query = query.gte("anio", anioMin);
  if (anioMax != null && Number.isFinite(anioMax)) query = query.lte("anio", anioMax);
  if (altoMin != null && Number.isFinite(altoMin)) query = query.gte("alto_cm", altoMin);
  if (material) query = query.ilike("material", `%${material}%`);

  const { data: obras, error } = await query;

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
      ) : !obras?.length ? (
        <p className="text-stone-600">No hay obras que coincidan. Cree la primera o importe un CSV.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {obras.map((o) => (
            <li key={o.id}>
              <Link
                href={`/obras/${o.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-400 hover:shadow"
              >
                <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Cat. {o.numero_catalogo}</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-900">{o.nombre}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-base text-stone-600">
                  <div>
                    <dt className="text-stone-500">Año</dt>
                    <dd>{o.anio ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Precio neto (€)</dt>
                    <dd>{o.precio_neto_estimado != null ? Number(o.precio_neto_estimado).toLocaleString("es-ES") : "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-stone-500">Material</dt>
                    <dd className="line-clamp-2">{o.material ?? "—"}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
