import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEscritura } from "@/lib/require-permiso";
import { VentasFormCliente } from "../VentasFormCliente";

type ObraEmb = { numero_catalogo: string; nombre: string };

function obraUnica(o: unknown): ObraEmb | null {
  if (!o) return null;
  if (Array.isArray(o)) return (o[0] as ObraEmb | undefined) ?? null;
  return o as ObraEmb;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Search = Record<string, string | string[] | undefined>;

export default async function NuevaVentaPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireEscritura("ventas");

  const sp = await searchParams;
  const rawObra = sp.obra_id;
  const obraIdFiltro = typeof rawObra === "string" && UUID_RE.test(rawObra) ? rawObra : null;

  const supabase = await createSupabaseServerClient();
  const { data: ejemplaresOp } = await supabase
    .from("ejemplares")
    .select("id, etiqueta, obra_id, obras(numero_catalogo, nombre)")
    .order("created_at", { ascending: true });

  const ejemplares = ((ejemplaresOp ?? []) as { id: string; etiqueta: string | null; obra_id: string; obras: unknown }[]).map((r) => ({
    id: r.id,
    etiqueta: r.etiqueta,
    obra_id: r.obra_id,
    obras: obraUnica(r.obras),
  }));

  return <VentasFormCliente ejemplares={ejemplares} obraIdFiltro={obraIdFiltro} />;
}
