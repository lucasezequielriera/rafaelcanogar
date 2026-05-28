"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { guardarPermisosUsuario } from "@/app/actions/permisos";
import { PermisosTabla, type PermisosTablaValor } from "@/components/PermisosTabla";

export function PermisosEditorCliente({ userId, inicial }: { userId: string; inicial: PermisosTablaValor }) {
  const [valor, setValor] = useState(inicial);
  const [state, action, pending] = useActionState(guardarPermisosUsuario.bind(null, userId), null as { error?: string; ok?: true } | null);

  return (
    <form action={action} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      {state?.error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-red-900">{state.error}</p> : null}
      {state?.ok ? <p className="rounded-lg bg-green-50 px-4 py-3 text-green-900">Permisos guardados.</p> : null}

      <PermisosTabla modoFormulario prefijoName="perm" valor={valor} onChange={setValor} />

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-stone-900 px-6 py-3 text-lg text-white disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar permisos"}
        </button>
        <Link href="/admin/usuarios" className="rounded-xl border border-stone-300 px-6 py-3 text-lg hover:bg-stone-50">
          Volver al listado
        </Link>
      </div>
    </form>
  );
}
