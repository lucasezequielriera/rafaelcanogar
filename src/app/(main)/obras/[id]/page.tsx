import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { puedeEscribir } from "@/lib/permisos-logica";
import { requireLectura } from "@/lib/require-permiso";
import { ObraDetalleCliente } from "./ObraDetalleCliente";

type PageProps = { params: Promise<{ id: string }> };

async function signedUrlFor(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, path: string) {
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export default async function ObraDetallePage({ params }: PageProps) {
  const sesion = await requireLectura("obras");
  const puedeEditar = {
    obra: puedeEscribir(sesion.niveles, "obras", sesion.isOwner),
    ejemplar: puedeEscribir(sesion.niveles, "ejemplares", sesion.isOwner),
    ubicacion: puedeEscribir(sesion.niveles, "ubicaciones_historial", sesion.isOwner),
    archivo: puedeEscribir(sesion.niveles, "archivos", sesion.isOwner),
  };

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: obra, error: oErr } = await supabase.from("obras").select("*").eq("id", id).maybeSingle();
  if (oErr || !obra) notFound();

  const { data: ejemplares } = await supabase.from("ejemplares").select("id, etiqueta, notas").eq("obra_id", id).order("created_at");

  const ejIds = (ejemplares ?? []).map((e) => e.id);
  const { data: ubiRows } =
    ejIds.length > 0
      ? await supabase.from("ubicaciones_ejemplar").select("id, ejemplar_id, ubicacion, fecha").in("ejemplar_id", ejIds).order("fecha", { ascending: false })
      : { data: [] as { id: string; ejemplar_id: string; ubicacion: string; fecha: string }[] };

  const ubicacionesPorEjemplar: Record<string, { id: string; ejemplar_id: string; ubicacion: string; fecha: string }[]> = {};
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

  const archivosEjemplar: Record<
    string,
    { id: string; tipo: string; obra_id: string | null; ejemplar_id: string | null; nombre_original: string | null; signedUrl: string | null }[]
  > = {};

  for (const row of archivosRows ?? []) {
    const signedUrl = await signedUrlFor(supabase, row.ruta_storage);
    const item = { ...row, signedUrl };
    if (row.ejemplar_id) {
      if (!archivosEjemplar[row.ejemplar_id]) archivosEjemplar[row.ejemplar_id] = [];
      archivosEjemplar[row.ejemplar_id].push(item);
    } else {
      archivosObra.push(item);
    }
  }

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

      <ObraDetalleCliente
        obra={obra}
        ejemplares={ejemplares ?? []}
        ubicacionesPorEjemplar={ubicacionesPorEjemplar}
        archivosObra={archivosObra}
        archivosEjemplar={archivosEjemplar}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
