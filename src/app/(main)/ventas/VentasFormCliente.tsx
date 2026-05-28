"use client";

import { useActionState } from "react";
import { crearVenta } from "@/app/actions/coleccion";

type EjemplarOpt = {
  id: string;
  etiqueta: string | null;
  obras: { numero_catalogo: string; nombre: string } | null;
};

export function VentasFormCliente({
  ejemplares,
  puedeRegistrar,
}: {
  ejemplares: EjemplarOpt[];
  puedeRegistrar: boolean;
}) {
  const [state, action, pending] = useActionState(crearVenta, null as { error?: string } | null);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">Registrar venta</h2>
      {!puedeRegistrar ? (
        <p className="mb-4 rounded-lg bg-stone-100 px-4 py-3 text-stone-800">Solo lectura: puede ver el listado pero no registrar ventas.</p>
      ) : null}
      {state?.error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-900" role="alert">
          {state.error}
        </p>
      ) : null}
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <fieldset disabled={!puedeRegistrar} className="contents">
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-medium">Ejemplar *</span>
          <select name="ejemplar_id" required className="rounded-lg border border-stone-300 px-3 py-3 text-lg">
            <option value="">Seleccione…</option>
            {ejemplares.map((e) => {
              const label = e.obras
                ? `Cat. ${e.obras.numero_catalogo} — ${e.obras.nombre} (${e.etiqueta || "sin etiqueta"})`
                : e.etiqueta ?? e.id;
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
        <button type="submit" disabled={pending || !puedeRegistrar} className="rounded-xl bg-stone-900 px-6 py-4 text-lg text-white md:col-span-2 disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar venta"}
        </button>
        </fieldset>
      </form>
    </section>
  );
}
