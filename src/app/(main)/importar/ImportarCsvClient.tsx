"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importarCsv } from "@/app/actions/importar";

export function ImportarCsvClient() {
  const [state, action, pending] = useActionState(importarCsv, null as { error?: string; ok?: boolean; imported?: number } | null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Importar CSV</h1>
        <p className="mt-2 text-stone-600">
          Descargue la plantilla, complete los datos y súbala aquí. Las filas con el mismo <strong>nº de catálogo</strong> se
          actualizan (no se duplican).
        </p>
        <p className="mt-2">
          <a href="/plantilla-importacion.csv" className="text-lg text-amber-900 underline" download>
            Descargar plantilla CSV
          </a>
        </p>
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-900">
          {state.error}
          {typeof state.imported === "number" ? ` (filas importadas antes del error: ${state.imported})` : ""}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-green-900">
          Importación correcta: {state.imported ?? 0} filas.
        </p>
      ) : null}

      <form action={action} className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <label className="flex flex-col gap-3">
          <span className="text-lg font-medium">Archivo .csv</span>
          <input name="csv" type="file" accept=".csv,text/csv" required className="text-lg" />
        </label>
        <button type="submit" disabled={pending} className="mt-6 rounded-xl bg-stone-900 px-6 py-4 text-lg text-white disabled:opacity-60">
          {pending ? "Importando…" : "Importar"}
        </button>
      </form>

      <Link href="/obras" className="inline-block text-lg text-stone-600 underline">
        Volver a obras
      </Link>
    </div>
  );
}
