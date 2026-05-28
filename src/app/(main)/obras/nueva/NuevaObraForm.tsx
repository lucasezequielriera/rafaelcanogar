"use client";

import { useActionState } from "react";
import Link from "next/link";
import { crearObra } from "@/app/actions/coleccion";

export function NuevaObraForm() {
  const [state, formAction, pending] = useActionState(crearObra, null as { error?: string } | null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Nueva obra</h1>
        <Link href="/obras" className="text-lg text-stone-600 underline">
          Volver
        </Link>
      </div>
      <form action={formAction} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {state?.error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-900" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-1">
            <span className="font-medium">Nº catálogo *</span>
            <input required name="numero_catalogo" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Nombre *</span>
            <input required name="nombre" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Año</span>
            <input name="anio" type="number" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Precio neto estimado (€)</span>
            <input name="precio_neto_estimado" type="number" step="0.01" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Material</span>
            <input name="material" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Tamaño (texto libre)</span>
            <input name="tamano_text" placeholder="ej. 60 x 18 x 25 cm" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Alto (cm) — para filtros</span>
            <input name="alto_cm" type="number" step="0.1" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Ancho (cm)</span>
            <input name="ancho_cm" type="number" step="0.1" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">Profundo (cm)</span>
            <input name="profundo_cm" type="number" step="0.1" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Edición</span>
            <input name="edicion_text" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Fundición</span>
            <input name="fundicion" className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Descripción</span>
            <textarea name="descripcion" rows={3} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-medium">Comentarios</span>
            <textarea name="comentarios" rows={2} className="rounded-lg border border-stone-300 px-3 py-3 text-lg" />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-stone-900 px-6 py-4 text-lg font-medium text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Crear obra"}
        </button>
      </form>
    </div>
  );
}
