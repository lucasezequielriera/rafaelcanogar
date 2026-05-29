"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { actualizarObra, subirArchivoObra } from "@/app/actions/coleccion";
import { EjemplaresEdicionFilas } from "@/components/EjemplaresEdicionFilas";
import { ObraFichaPublicaPanel } from "@/components/ObraFichaPublicaPanel";
import { unidadesDisponiblesSinPrestamo } from "@/lib/obras-disponibles";

type Obra = {
  id: string;
  numero_catalogo: string;
  nombre: string;
  anio: number | null;
  material: string | null;
  tamano_text: string | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundo_cm: number | null;
  edicion_text: string | null;
  fundicion: string | null;
  precio_neto_estimado: number | null;
  comentarios: string | null;
  descripcion: string | null;
  unidades_totales: number | null;
  unidades_disponibles: number | null;
  updated_at?: string | null;
  public_ficha_token?: string | null;
};

type Ejemplar = { id: string; etiqueta: string | null; notas: string | null; estado: string | null };
type Ubicacion = { id: string; ejemplar_id: string; ubicacion: string; fecha: string; tipo_movimiento?: string | null };
type VentaObraResumen = {
  id: string;
  fecha_venta: string;
  cantidad: number;
  importe: number | null;
  moneda: string | null;
  comprador_nombre: string | null;
  ejemplares: { etiqueta: string | null } | null;
};
type Archivo = {
  id: string;
  tipo: string;
  obra_id: string | null;
  ejemplar_id: string | null;
  nombre_original: string | null;
  signedUrl: string | null;
};

export type PuedeEditarObra = {
  obra: boolean;
  ejemplar: boolean;
  ubicacion: boolean;
  archivo: boolean;
};

type AccionObraArchivo = { error?: string; ok?: boolean } | null;

export function ObraDetalleCliente({
  obra,
  ejemplares,
  ventasObra,
  ubicacionesPorEjemplar,
  archivosObra,
  puedeEditar,
  puedeRegistrarVenta,
  publicOrigin,
}: {
  obra: Obra;
  ejemplares: Ejemplar[];
  ventasObra: VentaObraResumen[];
  ubicacionesPorEjemplar: Record<string, Ubicacion[]>;
  archivosObra: Archivo[];
  puedeEditar: PuedeEditarObra;
  puedeRegistrarVenta: boolean;
  publicOrigin: string;
}) {
  const router = useRouter();
  const [estadoObra, accionObra, pendienteObra] = useActionState(actualizarObra.bind(null, obra.id), null as AccionObraArchivo);
  const [estadoArchObra, accionArchObra, pendienteArchObra] = useActionState(subirArchivoObra.bind(null, obra.id), null as AccionObraArchivo);

  const prevPendiente = useRef({ ob: false, ar: false });
  useEffect(() => {
    const p = prevPendiente.current;
    const finObra = p.ob && !pendienteObra && Boolean(estadoObra?.ok);
    const finArch = p.ar && !pendienteArchObra && Boolean(estadoArchObra?.ok);
    if (finObra || finArch) {
      router.refresh();
    }
    prevPendiente.current = { ob: pendienteObra, ar: pendienteArchObra };
  }, [pendienteObra, pendienteArchObra, estadoObra, estadoArchObra, router]);

  const VENTAS_POR_PAGINA = 20;
  const [paginaPorAnio, setPaginaPorAnio] = useState<Record<number, number>>({});

  const unidadesTot = obra.unidades_totales ?? 0;
  const enPrestamoCount = useMemo(() => ejemplares.filter((e) => e.estado === "en_prestamo").length, [ejemplares]);
  const unidadesDisp = useMemo(
    () => unidadesDisponiblesSinPrestamo(obra.unidades_disponibles, enPrestamoCount),
    [obra.unidades_disponibles, enPrestamoCount],
  );

  const ejemplaresAsc = useMemo(() => [...ejemplares].reverse(), [ejemplares]);
  const prefillsEdicion = useMemo(
    () =>
      ejemplaresAsc.map((ej) => {
        const ubis = ubicacionesPorEjemplar[ej.id] ?? [];
        const u = ubis[0];
        const fe = u?.fecha ? String(u.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10);
        return {
          etiqueta: ej.etiqueta ?? "",
          notas: ej.notas ?? "",
          ultimaUbicacion: u?.ubicacion ?? "",
          ultimaFecha: fe,
        };
      }),
    [ejemplaresAsc, ubicacionesPorEjemplar],
  );

  const minEjemplares = ejemplaresAsc.length;
  const unidadesInicial = Math.max(minEjemplares, obra.unidades_totales ?? 0);
  /** Texto libre al editar (se puede vaciar); mientras está vacío se usa el último valor confirmado para filas y envío. */
  const [unidadesText, setUnidadesText] = useState(() => String(unidadesInicial));
  const [unidadesCommitted, setUnidadesCommitted] = useState(unidadesInicial);
  const parsedUnidades = unidadesText.trim() === "" ? NaN : parseInt(unidadesText, 10);
  const slotsTotales = Number.isFinite(parsedUnidades)
    ? Math.max(minEjemplares, parsedUnidades)
    : unidadesCommitted;

  const ventasPorAnio = (() => {
    const m = new Map<number, VentaObraResumen[]>();
    for (const v of ventasObra) {
      const y = Number(String(v.fecha_venta).slice(0, 4));
      if (!Number.isFinite(y)) continue;
      const arr = m.get(y) ?? [];
      arr.push(v);
      m.set(y, arr);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  })();

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">Datos de la obra</h2>
        {!puedeEditar.obra ? (
          <div className="grid gap-4 text-stone-800 sm:grid-cols-2">
            <p className="text-sm text-stone-600 sm:col-span-2">Solo lectura.</p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Nº catálogo:</span> {obra.numero_catalogo}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Nombre:</span> {obra.nombre}
            </p>
            <p>
              <span className="font-medium text-stone-900">Año:</span> {obra.anio ?? "—"}
            </p>
            <p>
              <span className="font-medium text-stone-900">Precio neto (€):</span>{" "}
              {obra.precio_neto_estimado != null ? Number(obra.precio_neto_estimado).toLocaleString("es-ES") : "—"}
            </p>
            {unidadesTot > 0 ? (
              <p className="rounded-lg bg-stone-50 px-3 py-3 sm:col-span-2">
                Ejemplares disponibles: <strong>{unidadesDisp}</strong> de <strong>{unidadesTot}</strong> previstos en la edición
                {enPrestamoCount > 0 ? (
                  <>
                    {" "}
                    (<strong>{enPrestamoCount}</strong> en préstamo no cuentan aquí como disponibles).
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-stone-600 sm:col-span-2">Sin cupo de ejemplares definido.</p>
            )}
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Material:</span> {obra.material ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Tamaño (texto):</span> {obra.tamano_text ?? "—"}
            </p>
            <p>
              <span className="font-medium text-stone-900">Alto (cm):</span> {obra.alto_cm ?? "—"}
            </p>
            <p>
              <span className="font-medium text-stone-900">Ancho (cm):</span> {obra.ancho_cm ?? "—"}
            </p>
            <p>
              <span className="font-medium text-stone-900">Profundo (cm):</span> {obra.profundo_cm ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Edición:</span> {obra.edicion_text ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Fundición:</span> {obra.fundicion ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Descripción:</span> {obra.descripcion ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-stone-900">Comentarios:</span> {obra.comentarios ?? "—"}
            </p>
          </div>
        ) : (
          <>
            {estadoObra?.error ? (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-900">{estadoObra.error}</p>
            ) : null}
            {estadoObra?.ok ? (
              <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-900" role="status">
                Cambios guardados correctamente.
              </p>
            ) : null}
            <form
              action={accionObra}
              key={`obra-edit-${obra.id}-${obra.updated_at ?? ""}-${obra.unidades_totales ?? 0}-${obra.unidades_disponibles ?? 0}-${ejemplares.map((e) => e.id).join("-")}`}
              className="grid gap-4 sm:grid-cols-2"
            >
              <p className="text-stone-600 sm:col-span-2">
                <span className="font-medium text-stone-800">Nº catálogo:</span> {obra.numero_catalogo} (no editable aquí)
              </p>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Nombre *</span>
                <input name="nombre" required defaultValue={obra.nombre} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Año</span>
                <input name="anio" type="number" defaultValue={obra.anio ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Precio neto (€)</span>
                <input
                  name="precio_neto_estimado"
                  type="number"
                  step="0.01"
                  defaultValue={obra.precio_neto_estimado ?? ""}
                  className="rounded-lg border border-stone-300 px-3 py-3 text-lg"
                />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Número de ejemplares de la edición</span>
                <input type="hidden" name="unidades_totales" value={String(slotsTotales)} />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={unidadesText}
                  onChange={(e) => setUnidadesText(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => {
                    const minU = ejemplaresAsc.length;
                    const p = unidadesText.trim() === "" ? NaN : parseInt(unidadesText, 10);
                    const next = Number.isFinite(p) ? Math.max(minU, p) : unidadesCommitted;
                    setUnidadesCommitted(next);
                    setUnidadesText(String(next));
                  }}
                  className="rounded-lg border border-stone-300 px-3 py-3 text-lg tabular-nums"
                  aria-label="Número de ejemplares de la edición"
                />
                <span className="text-xs text-stone-500">
                  0 = sin cupo. Si N es mayor que cero, complete las N filas debajo (mínimo = piezas ya dadas de alta).
                </span>
              </label>
              {slotsTotales > 0 ? (
                <EjemplaresEdicionFilas
                  variant="obra"
                  cantidad={slotsTotales}
                  existentesCount={ejemplaresAsc.length}
                  prefills={prefillsEdicion}
                />
              ) : null}
              {unidadesTot > 0 ? (
                <p className="rounded-md bg-stone-50 px-2 py-2 text-sm text-stone-800 sm:col-span-2">
                  Disponibles: <strong>{unidadesDisp}</strong> / <strong>{unidadesTot}</strong>
                </p>
              ) : (
                <p className="text-sm text-stone-600 sm:col-span-2">Sin cupo de ejemplares: no se impide vender por falta de unidades.</p>
              )}
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Material</span>
                <input name="material" defaultValue={obra.material ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Tamaño (texto)</span>
                <input name="tamano_text" defaultValue={obra.tamano_text ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Alto (cm)</span>
                <input name="alto_cm" type="number" step="0.1" defaultValue={obra.alto_cm ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Ancho (cm)</span>
                <input name="ancho_cm" type="number" step="0.1" defaultValue={obra.ancho_cm ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Profundo (cm)</span>
                <input name="profundo_cm" type="number" step="0.1" defaultValue={obra.profundo_cm ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Edición</span>
                <input name="edicion_text" defaultValue={obra.edicion_text ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Fundición</span>
                <input name="fundicion" defaultValue={obra.fundicion ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Descripción</span>
                <textarea name="descripcion" rows={3} defaultValue={obra.descripcion ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="font-medium">Comentarios</span>
                <textarea name="comentarios" rows={2} defaultValue={obra.comentarios ?? ""} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              </label>
              <button
                type="submit"
                disabled={pendienteObra}
                className="rounded-xl bg-stone-900 px-5 py-3 text-lg text-white hover:bg-stone-800 disabled:opacity-60 sm:col-span-2"
              >
                {pendienteObra ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          </>
        )}
      </section>

      {puedeEditar.obra ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-2xl font-semibold">Ficha pública (QR para clientes)</h2>
          <ObraFichaPublicaPanel obraId={obra.id} publicOrigin={publicOrigin} tokenInicial={obra.public_ficha_token ?? null} />
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-2xl font-semibold">Archivos de la obra</h2>
        {puedeEditar.archivo ? <p className="mb-4 text-stone-600">Hasta 5 imágenes y PDFs (certificados, notas).</p> : null}
        {puedeEditar.archivo ? (
          <>
            {estadoArchObra?.error ? <p className="mb-3 text-red-800">{estadoArchObra.error}</p> : null}
            {estadoArchObra?.ok ? <p className="mb-3 text-green-800">Archivo subido.</p> : null}
            <form action={accionArchObra} className="mb-8 flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-2">
                <span className="font-medium">Tipo</span>
                <select name="archivo_tipo" className="rounded-lg border border-stone-300 px-3 py-3 text-lg">
                  <option value="imagen_obra">Imagen</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Archivo</span>
                <input name="file" type="file" accept="image/*,application/pdf" className="text-lg" />
              </label>
              <button type="submit" disabled={pendienteArchObra} className="rounded-xl bg-stone-800 px-4 py-3 text-white disabled:opacity-60">
                Subir
              </button>
            </form>
          </>
        ) : null}
        <ul className="grid gap-4 sm:grid-cols-2">
          {archivosObra.map((a) => (
            <li key={a.id} className="rounded-xl border border-stone-200 p-3">
              {a.signedUrl && a.tipo === "imagen_obra" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.signedUrl} alt={a.nombre_original ?? ""} className="max-h-48 w-full rounded-lg object-contain" />
              ) : (
                <a href={a.signedUrl ?? "#"} className="text-lg text-amber-900 underline" target="_blank" rel="noreferrer">
                  {a.nombre_original ?? "PDF"}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      {puedeRegistrarVenta ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-2xl font-semibold">Ventas por año</h2>
          <p className="mb-6 text-stone-600">
            Ventas de ejemplares de esta obra: comprador, fecha, importe y cantidad. Para registrar una venta use{" "}
            <Link href="/ventas/nueva" className="font-medium text-stone-900 underline">
              Nueva venta
            </Link>
            .
          </p>
          {ventasPorAnio.length === 0 ? (
            <p className="text-stone-600">Aún no hay ventas registradas para los ejemplares de esta obra.</p>
          ) : (
            <div className="space-y-10">
              {ventasPorAnio.map(([anio, lista]) => {
                const total = lista.length;
                const totalPag = Math.max(1, Math.ceil(total / VENTAS_POR_PAGINA));
                const pagRaw = paginaPorAnio[anio] ?? 1;
                const pag = Math.min(Math.max(1, pagRaw), totalPag);
                const desde = (pag - 1) * VENTAS_POR_PAGINA;
                const hasta = Math.min(desde + VENTAS_POR_PAGINA, total);
                const slice = lista.slice(desde, desde + VENTAS_POR_PAGINA);
                const setPag = (n: number) => setPaginaPorAnio((m) => ({ ...m, [anio]: n }));
                return (
                  <div key={anio}>
                    <h3 className="mb-3 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900">{anio}</h3>
                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="min-w-full text-left text-base">
                        <thead className="bg-stone-100 text-stone-800">
                          <tr>
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Ejemplar</th>
                            <th className="px-3 py-2">Cant.</th>
                            <th className="px-3 py-2">Importe</th>
                            <th className="px-3 py-2">Comprador</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slice.map((v) => (
                            <tr key={v.id} className="border-t border-stone-200">
                              <td className="px-3 py-2 whitespace-nowrap">{v.fecha_venta}</td>
                              <td className="px-3 py-2">{v.ejemplares?.etiqueta ?? "—"}</td>
                              <td className="px-3 py-2">{v.cantidad}</td>
                              <td className="px-3 py-2">
                                {v.importe != null ? `${Number(v.importe).toLocaleString("es-ES")} ${v.moneda ?? ""}` : "—"}
                              </td>
                              <td className="px-3 py-2 max-w-xs">{v.comprador_nombre ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {total > VENTAS_POR_PAGINA ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/80 px-3 py-2 text-sm text-stone-700">
                          <p>
                            Mostrando {total === 0 ? 0 : desde + 1}–{hasta} de {total} · Página {pag} de {totalPag}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={pag <= 1}
                              onClick={() => setPag(pag - 1)}
                              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                            >
                              Anterior
                            </button>
                            <button
                              type="button"
                              disabled={pag >= totalPag}
                              onClick={() => setPag(pag + 1)}
                              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
