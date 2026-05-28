"use client";

import { useActionState } from "react";
import {
  actualizarObra,
  crearEjemplar,
  registrarUbicacion,
  subirArchivoEjemplar,
  subirArchivoObra,
} from "@/app/actions/coleccion";

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
};

type Ejemplar = { id: string; etiqueta: string | null; notas: string | null };
type Ubicacion = { id: string; ejemplar_id: string; ubicacion: string; fecha: string };
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

export function ObraDetalleCliente({
  obra,
  ejemplares,
  ubicacionesPorEjemplar,
  archivosObra,
  archivosEjemplar,
  puedeEditar,
}: {
  obra: Obra;
  ejemplares: Ejemplar[];
  ubicacionesPorEjemplar: Record<string, Ubicacion[]>;
  archivosObra: Archivo[];
  archivosEjemplar: Record<string, Archivo[]>;
  puedeEditar: PuedeEditarObra;
}) {
  const [estadoObra, accionObra, pendienteObra] = useActionState(actualizarObra.bind(null, obra.id), null as { error?: string } | null);
  const [estadoEj, accionEj, pendienteEj] = useActionState(crearEjemplar.bind(null, obra.id), null as { error?: string } | null);
  const [estadoArchObra, accionArchObra, pendienteArchObra] = useActionState(subirArchivoObra.bind(null, obra.id), null as { error?: string; ok?: boolean } | null);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">Datos de la obra</h2>
        {!puedeEditar.obra ? (
          <p className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-stone-800">Solo lectura: no tiene permiso para modificar obras.</p>
        ) : null}
        {estadoObra?.error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-900">{estadoObra.error}</p>
        ) : null}
        <form action={accionObra} className="grid gap-4 sm:grid-cols-2">
          <fieldset disabled={!puedeEditar.obra} className="contents sm:col-span-2">
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
          <button type="submit" disabled={pendienteObra || !puedeEditar.obra} className="rounded-xl bg-stone-900 px-5 py-3 text-lg text-white hover:bg-stone-800 disabled:opacity-60 sm:col-span-2">
            {pendienteObra ? "Guardando…" : "Guardar cambios"}
          </button>
        </fieldset>
        </form>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-2xl font-semibold">Archivos de la obra</h2>
        <p className="mb-4 text-stone-600">Hasta 5 imágenes y PDFs (certificados, notas).</p>
        {!puedeEditar.archivo ? (
          <p className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-stone-800">Solo lectura: no puede subir ni cambiar archivos de la obra.</p>
        ) : null}
        {estadoArchObra?.error ? <p className="mb-3 text-red-800">{estadoArchObra.error}</p> : null}
        {estadoArchObra?.ok ? <p className="mb-3 text-green-800">Archivo subido.</p> : null}
        <form action={accionArchObra} className="mb-8 flex flex-wrap items-end gap-4">
          <fieldset disabled={!puedeEditar.archivo} className="contents flex flex-wrap items-end gap-4">
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
          <button type="submit" disabled={pendienteArchObra || !puedeEditar.archivo} className="rounded-xl bg-stone-800 px-4 py-3 text-white disabled:opacity-60">
            Subir
          </button>
          </fieldset>
        </form>
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

      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-2xl font-semibold">Ejemplares</h2>
        {estadoEj?.error ? <p className="mb-3 text-red-800">{estadoEj.error}</p> : null}
        {!puedeEditar.ejemplar ? (
          <p className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-stone-800">Solo lectura: no puede añadir ejemplares.</p>
        ) : null}
        <form action={accionEj} className="mb-8 grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
          <fieldset disabled={!puedeEditar.ejemplar} className="contents">
          <label className="flex flex-col gap-2">
            <span className="font-medium">Etiqueta (ej. 3/20, P.A. II)</span>
            <input name="etiqueta" className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Notas</span>
            <input name="notas" className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
          </label>
          <button type="submit" disabled={pendienteEj || !puedeEditar.ejemplar} className="rounded-xl bg-stone-900 px-4 py-3 text-white sm:col-span-2">
            Añadir ejemplar
          </button>
          </fieldset>
        </form>

        <div className="space-y-10">
          {ejemplares.map((ej) => (
            <EjemplarBloque
              key={ej.id}
              obraId={obra.id}
              ejemplar={ej}
              ubicaciones={ubicacionesPorEjemplar[ej.id] ?? []}
              archivos={archivosEjemplar[ej.id] ?? []}
              puedeUbicacion={puedeEditar.ubicacion}
              puedeArchivoEjemplar={puedeEditar.archivo}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function EjemplarBloque({
  obraId,
  ejemplar,
  ubicaciones,
  archivos,
  puedeUbicacion,
  puedeArchivoEjemplar,
}: {
  obraId: string;
  ejemplar: Ejemplar;
  ubicaciones: Ubicacion[];
  archivos: Archivo[];
  puedeUbicacion: boolean;
  puedeArchivoEjemplar: boolean;
}) {
  const [estadoUbi, accionUbi, pendienteUbi] = useActionState(registrarUbicacion.bind(null, ejemplar.id, obraId), null as { error?: string } | null);
  const [estadoImg, accionImg, pendienteImg] = useActionState(subirArchivoEjemplar.bind(null, obraId, ejemplar.id), null as { error?: string; ok?: boolean } | null);

  return (
    <article className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
      <h3 className="text-xl font-semibold text-stone-900">{ejemplar.etiqueta || "Sin etiqueta"}</h3>
      {ejemplar.notas ? <p className="mt-1 text-stone-700">{ejemplar.notas}</p> : null}

      <h4 className="mt-6 text-lg font-medium">Ubicación / préstamo (historial)</h4>
      <ul className="mt-2 space-y-2">
        {ubicaciones.length === 0 ? (
          <li className="text-stone-600">Sin movimientos registrados.</li>
        ) : (
          ubicaciones.map((u) => (
            <li key={u.id} className="rounded-lg bg-white px-3 py-2 text-stone-800">
              <span className="font-medium">{u.fecha}</span> — {u.ubicacion}
            </li>
          ))
        )}
      </ul>
      {estadoUbi?.error ? <p className="mt-2 text-red-800">{estadoUbi.error}</p> : null}
      {!puedeUbicacion ? (
        <p className="mt-2 rounded-lg bg-stone-100 px-3 py-2 text-stone-700">Solo lectura del historial de ubicaciones.</p>
      ) : null}
      <form action={accionUbi} className="mt-4 grid gap-3 sm:grid-cols-3">
        <fieldset disabled={!puedeUbicacion} className="contents">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">Nueva ubicación</span>
          <input name="ubicacion" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg" placeholder="Galería, estudio…" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700">Fecha</span>
          <input name="fecha" type="date" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
        </label>
        <button type="submit" disabled={pendienteUbi || !puedeUbicacion} className="rounded-xl bg-stone-800 px-4 py-2 text-white sm:col-span-3">
          Registrar movimiento
        </button>
        </fieldset>
      </form>

      <h4 className="mt-8 text-lg font-medium">Fotos del ejemplar</h4>
      {!puedeArchivoEjemplar ? (
        <p className="mt-2 rounded-lg bg-stone-100 px-3 py-2 text-stone-700">Solo lectura: no puede subir fotos del ejemplar.</p>
      ) : null}
      {estadoImg?.error ? <p className="mt-2 text-red-800">{estadoImg.error}</p> : null}
      {estadoImg?.ok ? <p className="text-green-800">Imagen guardada.</p> : null}
      <form action={accionImg} className="mt-2 flex flex-wrap items-end gap-3">
        <fieldset disabled={!puedeArchivoEjemplar} className="contents flex flex-wrap items-end gap-3">
        <input name="file" type="file" accept="image/*" className="text-lg" />
        <button type="submit" disabled={pendienteImg || !puedeArchivoEjemplar} className="rounded-xl bg-stone-800 px-4 py-2 text-white">
          Subir imagen
        </button>
        </fieldset>
      </form>
      <ul className="mt-4 flex flex-wrap gap-3">
        {archivos.map((a) => (
          <li key={a.id}>
            {a.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.signedUrl} alt="" className="h-28 w-28 rounded-lg object-cover" />
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
