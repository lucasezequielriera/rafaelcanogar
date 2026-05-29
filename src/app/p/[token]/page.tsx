import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const admin = createSupabaseServiceClient();
  if (!admin) return { title: "Ficha de obra" };
  const { data: obra } = await admin
    .from("obras")
    .select("nombre, numero_catalogo")
    .eq("public_ficha_token", token)
    .maybeSingle();
  if (!obra) return { title: "Ficha no encontrada" };
  return {
    title: `${obra.nombre} — Cat. ${obra.numero_catalogo}`,
    description: "Información pública de la obra.",
  };
}

export default async function FichaPublicaObraPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length > 200) notFound();

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center text-stone-700">
        <p className="text-xl font-semibold text-stone-900">Ficha pública no disponible</p>
        <p className="mt-3 text-lg">Falta la clave de servidor (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY) en el entorno.</p>
      </div>
    );
  }

  const { data: obra, error } = await admin
    .from("obras")
    .select(
      "id, numero_catalogo, nombre, anio, material, tamano_text, alto_cm, ancho_cm, profundo_cm, edicion_text, fundicion, descripcion, unidades_totales",
    )
    .eq("public_ficha_token", token)
    .maybeSingle();

  if (error || !obra) notFound();

  const { data: imgRow } = await admin
    .from("archivos")
    .select("ruta_storage")
    .eq("obra_id", obra.id)
    .eq("tipo", "imagen_obra")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let imagenUrl: string | null = null;
  if (imgRow?.ruta_storage) {
    const { data: signed } = await admin.storage.from("media").createSignedUrl(imgRow.ruta_storage as string, 60 * 60);
    imagenUrl = signed?.signedUrl ?? null;
  }

  const uTot = obra.unidades_totales != null ? Number(obra.unidades_totales) : 0;

  return (
    <div className="min-h-full bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Ficha pública</p>
          <Link href="/login" className="text-sm text-stone-600 underline hover:text-stone-900">
            Acceso equipo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {imagenUrl ? (
            <div className="border-b border-stone-200 bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagenUrl} alt="" className="mx-auto max-h-80 w-full object-contain" />
            </div>
          ) : null}
          <div className="space-y-4 p-8">
            <p className="text-sm font-semibold text-amber-900">Catálogo n.º {obra.numero_catalogo}</p>
            <h1 className="text-3xl font-semibold leading-tight text-stone-900">{obra.nombre}</h1>
            {obra.anio != null ? <p className="text-lg text-stone-600">Año: {obra.anio}</p> : null}
            {uTot > 0 ? (
              <p className="rounded-lg bg-stone-50 px-3 py-2 text-stone-700">Edición prevista: {uTot} ejemplar{uTot === 1 ? "" : "es"}.</p>
            ) : null}
            {obra.material ? (
              <p>
                <span className="font-medium text-stone-800">Material:</span> {obra.material}
              </p>
            ) : null}
            {obra.tamano_text || obra.alto_cm != null || obra.ancho_cm != null || obra.profundo_cm != null ? (
              <div>
                <p className="font-medium text-stone-800">Dimensiones</p>
                {obra.tamano_text ? <p className="text-stone-700">{obra.tamano_text}</p> : null}
                {(obra.alto_cm != null || obra.ancho_cm != null || obra.profundo_cm != null) && (
                  <p className="text-stone-700">
                    {obra.alto_cm != null ? `${Number(obra.alto_cm)} cm (alto)` : null}
                    {obra.alto_cm != null && (obra.ancho_cm != null || obra.profundo_cm != null) ? " · " : null}
                    {obra.ancho_cm != null ? `${Number(obra.ancho_cm)} cm (ancho)` : null}
                    {obra.ancho_cm != null && obra.profundo_cm != null ? " · " : null}
                    {obra.profundo_cm != null ? `${Number(obra.profundo_cm)} cm (profundo)` : null}
                  </p>
                )}
              </div>
            ) : null}
            {obra.edicion_text ? (
              <p>
                <span className="font-medium text-stone-800">Edición:</span> {obra.edicion_text}
              </p>
            ) : null}
            {obra.fundicion ? (
              <p>
                <span className="font-medium text-stone-800">Fundición:</span> {obra.fundicion}
              </p>
            ) : null}
            {obra.descripcion ? (
              <div className="border-t border-stone-100 pt-4">
                <p className="font-medium text-stone-800">Descripción</p>
                <p className="mt-2 whitespace-pre-wrap text-stone-700">{obra.descripcion}</p>
              </div>
            ) : null}
          </div>
        </article>
        <p className="mt-8 text-center text-sm text-stone-500">Información orientativa. Para certificaciones o adquisiciones, contacte con la galería o el estudio.</p>
      </main>
    </div>
  );
}
