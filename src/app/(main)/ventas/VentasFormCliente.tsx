"use client";

import Link from "next/link";
import { useActionState } from "react";
import { crearVenta } from "@/app/actions/coleccion";

type EjemplarOpt = {
  id: string;
  etiqueta: string | null;
  obra_id: string;
  obras: { numero_catalogo: string; nombre: string } | null;
};

export function VentasFormCliente({
  ejemplares,
  obraIdFiltro = null,
}: {
  ejemplares: EjemplarOpt[];
  /** Si viene de la tabla de obras, solo se listan ejemplares de esa obra. */
  obraIdFiltro?: string | null;
}) {
  const [state, action, pending] = useActionState(crearVenta, null as { error?: string } | null);

  const lista = obraIdFiltro ? ejemplares.filter((e) => e.obra_id === obraIdFiltro) : ejemplares;
  const defaultEjemplarId = lista[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Nueva venta</h1>
        <Link href="/ventas" className="text-lg text-stone-600 underline">
          Volver
        </Link>
      </div>
      <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {state?.error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-900" role="alert">
            {state.error}
          </p>
        ) : null}
        {lista.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-lg text-stone-800">
            <p>No hay ejemplares disponibles en esta obra para registrar una venta.</p>
            {obraIdFiltro ? (
              <p className="mt-3">
                <Link href={`/obras/${obraIdFiltro}`} className="font-medium text-stone-900 underline">
                  Volver a la ficha de la obra
                </Link>{" "}
                o{" "}
                <Link href="/ventas/nueva" className="font-medium text-stone-900 underline">
                  nueva venta sin filtrar por obra
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : (
          <form action={action} className="grid gap-4 md:grid-cols-2">
            {obraIdFiltro ? (
              <p className="md:col-span-2 rounded-lg bg-stone-50 px-3 py-2 text-base text-stone-700">
                Mostrando solo ejemplares de la obra seleccionada desde el listado.{" "}
                <Link href="/ventas/nueva" className="font-medium text-stone-900 underline">
                  Ver todas las piezas
                </Link>
              </p>
            ) : null}
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Ejemplar *</span>
              <select
                name="ejemplar_id"
                required
                key={obraIdFiltro ?? "todos"}
                defaultValue={defaultEjemplarId}
                className="rounded-lg border border-stone-300 px-3 py-3 text-lg"
              >
                <option value="">Seleccione…</option>
                {lista.map((e) => {
                  const label = e.obras
                    ? `Cat. ${e.obras.numero_catalogo} — ${e.obras.nombre} (${e.etiqueta || "sin etiqueta"})`
                    : (e.etiqueta ?? e.id);
                  return (
                    <option key={e.id} value={e.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Fecha de venta *</span>
              <input name="fecha_venta" type="date" required className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Importe</span>
              <input name="importe" type="number" step="0.01" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Cantidad vendida</span>
              <input name="cantidad" type="number" min={1} defaultValue={1} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
              <span className="text-sm text-stone-600">
                Al vender, se descuentan solo si la obra tiene fijado un número de ejemplares de la edición (mayor que cero).
              </span>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Moneda</span>
              <input name="moneda" defaultValue="EUR" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Comprador (nombre)</span>
              <input name="comprador_nombre" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Documento comprador</span>
              <input name="comprador_documento" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Email comprador</span>
              <input name="comprador_email" type="email" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Teléfono</span>
              <input name="comprador_telefono" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Dirección comprador</span>
              <input name="comprador_direccion" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Galería / intermediario</span>
              <input name="galeria_intermediario" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Nº factura</span>
              <input name="numero_factura" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Forma de pago</span>
              <input name="forma_pago" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Notas fiscales</span>
              <textarea name="notas_fiscales" rows={2} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="font-medium">Detalle / observaciones</span>
              <textarea name="detalle" rows={3} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-stone-900 px-6 py-4 text-lg text-white md:col-span-2 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar venta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
