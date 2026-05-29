"use client";

import { useActionState } from "react";
import { actualizarNombrePerfilDestino } from "@/app/actions/perfil-destino";

export function NombrePerfilDestinoForm({
  userId,
  nombreInicial,
  titulo = "Nombre para mostrar",
}: {
  userId: string;
  nombreInicial: string | null;
  titulo?: string;
}) {
  const [state, action, pending] = useActionState(actualizarNombrePerfilDestino.bind(null, userId), null as { error?: string; ok?: true } | null);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      {state?.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-red-900">{state.error}</p> : null}
      {state?.ok ? <p className="rounded-lg bg-green-50 px-3 py-2 text-green-900">Nombre actualizado.</p> : null}
      <label className="flex flex-col gap-2">
        <span className="font-medium">{titulo}</span>
        <input
          name="nombre_completo"
          defaultValue={nombreInicial ?? ""}
          required
          className="rounded-lg border px-3 py-2 text-lg"
          autoComplete="name"
        />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar nombre"}
      </button>
    </form>
  );
}
