"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarEjemplaresParaObra,
  registrarBajaDesdeListadoObra,
  registrarPrestamoDesdeListadoObra,
} from "@/app/actions/coleccion";

type EjOpt = { id: string; etiqueta: string | null };

type Props = {
  obraId: string;
  numeroCatalogo: string;
  nombreObra: string;
  puedePrestamo: boolean;
  puedeBaja: boolean;
};

type AccionEstado = { error?: string; ok?: boolean } | null;

function labelEjemplar(e: EjOpt): string {
  return e.etiqueta?.trim() ? e.etiqueta : `Pieza ${e.id.slice(0, 8)}…`;
}

function CuerpoModalBaja({
  obraId,
  ejemplares,
  onListo,
  onCancelar,
}: {
  obraId: string;
  ejemplares: EjOpt[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(registrarBajaDesdeListadoObra.bind(null, obraId), null as AccionEstado);

  if (estado?.ok) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-lg bg-emerald-50 px-3 py-3 text-emerald-900" role="status">
          Baja registrada correctamente.
        </p>
        <button type="button" onClick={onListo} className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
          Listo
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="mt-6 space-y-4">
      {estado?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {estado.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Ejemplar *</span>
        <select name="ejemplar_id" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg">
          <option value="">Seleccione…</option>
          {ejemplares.map((e) => (
            <option key={e.id} value={e.id}>
              {labelEjemplar(e)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Descripción del motivo *</span>
        <textarea
          name="descripcion"
          required
          rows={4}
          className="rounded-lg border border-stone-300 px-3 py-2 text-lg"
          placeholder="Ej.: Rotura en el traslado, pieza irreparable…"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Imágenes (opcional)</span>
        <input name="evidencias" type="file" accept="image/*" multiple className="text-base" />
        <span className="text-xs text-stone-500">Se guardan en la ficha de la obra como evidencia (máx. 5 imágenes de obra en total; solo imágenes).</span>
      </label>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-xl bg-red-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Confirmar baja"}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CuerpoModalPrestamo({
  obraId,
  ejemplares,
  fechaDefault,
  onListo,
  onCancelar,
}: {
  obraId: string;
  ejemplares: EjOpt[];
  fechaDefault: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(registrarPrestamoDesdeListadoObra.bind(null, obraId), null as AccionEstado);

  if (estado?.ok) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-lg bg-emerald-50 px-3 py-3 text-emerald-900" role="status">
          Préstamo registrado. Verá el detalle en la ficha de la obra, en el historial de la pieza.
        </p>
        <button type="button" onClick={onListo} className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
          Listo
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="mt-6 space-y-4">
      {estado?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {estado.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Ejemplar *</span>
        <select name="ejemplar_id" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg">
          <option value="">Seleccione…</option>
          {ejemplares.map((e) => (
            <option key={e.id} value={e.id}>
              {labelEjemplar(e)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Dónde está la pieza ahora *</span>
        <input name="donde_esta_pieza" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg" placeholder="Ej.: Depósito, en embalaje…" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Préstamo a (nombre o entidad) *</span>
        <input name="prestatario_nombre" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Fecha *</span>
        <input name="fecha" type="date" required defaultValue={fechaDefault} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Email de contacto *</span>
        <input name="prestatario_email" type="email" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Teléfono *</span>
        <input name="prestatario_telefono" type="tel" required className="rounded-lg border border-stone-300 px-3 py-2 text-lg" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Ubicación / datos para localizar *</span>
        <textarea
          name="ubicacion_seguimiento"
          required
          rows={2}
          className="rounded-lg border border-stone-300 px-3 py-2 text-lg"
          placeholder="Dirección, ciudad, persona de contacto, referencia del envío…"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">Notas adicionales</span>
        <textarea name="notas_prestamo" rows={2} className="rounded-lg border border-stone-300 px-3 py-2 text-lg" placeholder="Opcional" />
      </label>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Guardar préstamo"}
        </button>
        <Link href={`/obras/${obraId}`} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
          Ver ficha de la obra
        </Link>
        <button type="button" onClick={onCancelar} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ObrasFilaAcciones({ obraId, numeroCatalogo, nombreObra, puedePrestamo, puedeBaja }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<"baja" | "prestamo" | null>(null);
  const [ejemplares, setEjemplares] = useState<EjOpt[] | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [mountKeyBaja, setMountKeyBaja] = useState(0);
  const [mountKeyPrest, setMountKeyPrest] = useState(0);

  function listoTrasExito() {
    cerrar();
    router.refresh();
  }

  function cerrar() {
    setModal(null);
    setEjemplares(null);
    setErrorLista(null);
  }

  async function abrirModal(tipo: "baja" | "prestamo") {
    if (tipo === "baja") setMountKeyBaja((k) => k + 1);
    else setMountKeyPrest((k) => k + 1);
    setModal(tipo);
    setErrorLista(null);
    setEjemplares(null);
    setCargandoLista(true);
    const r = await listarEjemplaresParaObra(obraId);
    setCargandoLista(false);
    if ("error" in r) {
      setErrorLista(r.error);
      setEjemplares([]);
      return;
    }
    setEjemplares(r.ejemplares);
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="flex flex-row flex-wrap justify-end gap-1.5">
        {puedePrestamo ? (
          <button
            type="button"
            onClick={() => void abrirModal("prestamo")}
            className="inline-flex items-center justify-center rounded-lg border border-amber-300/90 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Préstamo
          </button>
        ) : null}
        {puedeBaja ? (
          <button
            type="button"
            onClick={() => void abrirModal("baja")}
            className="inline-flex items-center justify-center rounded-lg border border-red-300/90 bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-950 hover:bg-red-100"
          >
            Baja
          </button>
        ) : null}
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-obra-acciones-titulo"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="modal-obra-acciones-titulo" className="text-xl font-semibold text-stone-900">
                  {modal === "baja" ? "Baja de ejemplar" : "Registrar préstamo"}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Cat. {numeroCatalogo} — {nombreObra}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrar}
                className="rounded-lg px-2 py-1 text-2xl leading-none text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {cargandoLista ? <p className="mt-6 text-stone-600">Cargando piezas…</p> : null}
            {errorLista ? <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-red-900">{errorLista}</p> : null}

            {!cargandoLista && ejemplares && ejemplares.length === 0 ? (
              <p className="mt-6 text-stone-700">Esta obra no tiene ejemplares dados de alta. Añádalos desde la ficha de la obra.</p>
            ) : null}

            {!cargandoLista && ejemplares && ejemplares.length > 0 && modal === "baja" ? (
              <CuerpoModalBaja key={mountKeyBaja} obraId={obraId} ejemplares={ejemplares} onListo={listoTrasExito} onCancelar={cerrar} />
            ) : null}

            {!cargandoLista && ejemplares && ejemplares.length > 0 && modal === "prestamo" ? (
              <CuerpoModalPrestamo
                key={mountKeyPrest}
                obraId={obraId}
                ejemplares={ejemplares}
                fechaDefault={hoy}
                onListo={listoTrasExito}
                onCancelar={cerrar}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
