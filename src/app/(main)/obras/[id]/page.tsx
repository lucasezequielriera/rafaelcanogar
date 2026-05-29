import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { puedeEscribir } from "@/lib/permisos-logica";
import { requireLectura } from "@/lib/require-permiso";
import { unidadesDisponiblesSinPrestamo } from "@/lib/obras-disponibles";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { ObraDetalleCliente } from "./ObraDetalleCliente";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function signedUrlFor(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, path: string) {
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export default async function ObraDetallePage({ params, searchParams }: PageProps) {
  const sesion = await requireLectura("obras");
  const puedeEditar = {
    obra: puedeEscribir(sesion.niveles, "obras", sesion.isOwner),
    ejemplar: puedeEscribir(sesion.niveles, "ejemplares", sesion.isOwner),
    ubicacion: puedeEscribir(sesion.niveles, "ubicaciones_historial", sesion.isOwner),
    archivo: puedeEscribir(sesion.niveles, "archivos", sesion.isOwner),
  };

  const { id } = await params;
  const q = await searchParams;
  const ventaRegistrada = q.venta_registrada === "1";
  const supabase = await createSupabaseServerClient();

  const { data: obra, error: oErr } = await supabase.from("obras").select("*").eq("id", id).maybeSingle();
  if (oErr || !obra) notFound();

  const { data: ejemplares } = await supabase
    .from("ejemplares")
    .select("id, etiqueta, notas, estado")
    .eq("obra_id", id)
    .order("created_at", { ascending: false });

  const ejIds = (ejemplares ?? []).map((e) => e.id);
  const { data: ventasObraRaw } =
    ejIds.length > 0
      ? await supabase
          .from("ventas")
          .select("id, fecha_venta, cantidad, importe, moneda, comprador_nombre, ejemplares(etiqueta)")
          .in("ejemplar_id", ejIds)
          .order("fecha_venta", { ascending: false })
      : { data: [] as { id: string; fecha_venta: string; cantidad: number | null; importe: number | null; moneda: string | null; comprador_nombre: string | null; ejemplares: unknown }[] };

  const ventasObra = (ventasObraRaw ?? []).map((v) => ({
    id: v.id,
    fecha_venta: v.fecha_venta,
    cantidad: typeof v.cantidad === "number" ? v.cantidad : 1,
    importe: v.importe,
    moneda: v.moneda,
    comprador_nombre: v.comprador_nombre,
    ejemplares: (() => {
      const ej = v.ejemplares as { etiqueta: string | null } | { etiqueta: string | null }[] | null;
      if (!ej) return null;
      if (Array.isArray(ej)) return ej[0] ?? null;
      return ej;
    })(),
  }));
  const { data: ubiRows } =
    ejIds.length > 0
      ? await supabase.from("ubicaciones_ejemplar").select("id, ejemplar_id, ubicacion, fecha").in("ejemplar_id", ejIds).order("fecha", { ascending: false })
      : { data: [] as { id: string; ejemplar_id: string; ubicacion: string; fecha: string }[] };

  const ubicacionesPorEjemplar: Record<
    string,
    { id: string; ejemplar_id: string; ubicacion: string; fecha: string; tipo_movimiento?: string | null }[]
  > = {};
  for (const u of ubiRows ?? []) {
    if (!ubicacionesPorEjemplar[u.ejemplar_id]) ubicacionesPorEjemplar[u.ejemplar_id] = [];
    ubicacionesPorEjemplar[u.ejemplar_id].push(u);
  }

  const { data: archivosRows } = await supabase.from("archivos").select("id, tipo, obra_id, ejemplar_id, nombre_original, ruta_storage").eq("obra_id", id);

  const archivosObra: {
    id: string;
    tipo: string;
    obra_id: string | null;
    ejemplar_id: string | null;
    nombre_original: string | null;
    signedUrl: string | null;
  }[] = [];

  for (const row of archivosRows ?? []) {
    if (row.ejemplar_id) continue;
    const signedUrl = await signedUrlFor(supabase, row.ruta_storage);
    archivosObra.push({ ...row, signedUrl });
  }

  const enPrestamoObra = (ejemplares ?? []).filter((e) => e.estado === "en_prestamo").length;
  const disponiblesMostrar = unidadesDisponiblesSinPrestamo(obra.unidades_disponibles, enPrestamoObra);
  const publicOrigin = await getPublicSiteUrl();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/obras" className="text-lg text-stone-600 underline">
            ← Obras
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">
            Cat. {obra.numero_catalogo} — {obra.nombre}
          </h1>
        </div>
      </div>

      {ventaRegistrada ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-6 py-4 text-lg text-stone-800 shadow-sm" role="status">
          <p className="font-semibold text-stone-900">Venta registrada</p>
          <p className="mt-1">
            {(obra.unidades_totales ?? 0) > 0 ? (
              <>
                Ejemplares disponibles: <strong>{disponiblesMostrar}</strong> de{" "}
                <strong>{Number(obra.unidades_totales ?? 0)}</strong> previstos en la edición
                {enPrestamoObra > 0 ? (
                  <>
                    {" "}
                    (<strong>{enPrestamoObra}</strong> en préstamo no cuentan como disponibles aquí).
                  </>
                ) : null}
                .
              </>
            ) : (
              <>No hay cupo de ejemplares definido para esta obra; no se controla el saldo al vender.</>
            )}
          </p>
        </div>
      ) : null}

      <ObraDetalleCliente
        key={`obra-detalle-${obra.id}-${String(obra.updated_at ?? "")}`}
        obra={obra}
        ejemplares={ejemplares ?? []}
        ventasObra={ventasObra}
        ubicacionesPorEjemplar={ubicacionesPorEjemplar}
        archivosObra={archivosObra}
        puedeEditar={puedeEditar}
        puedeRegistrarVenta={puedeEscribir(sesion.niveles, "ventas", sesion.isOwner)}
        publicOrigin={publicOrigin}
      />
    </div>
  );
}
