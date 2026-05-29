"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  userId: string;
  nombre: string | null;
  isOwner: boolean;
  currentUserId: string;
};

export function UsuariosFilaAcciones({ userId, nombre, isOwner, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const esYo = userId === currentUserId;
  const etiqueta = nombre?.trim() || "este usuario";

  async function eliminar() {
    if (esYo) return;
      if (!window.confirm(`¿Eliminar a ${etiqueta}${isOwner ? " (propietario)" : ""}? No se puede deshacer: se borrará la cuenta y sus permisos.`)) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "No se pudo eliminar.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/admin/usuarios/${userId}`} className="inline-flex rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-base font-medium text-stone-900 hover:bg-stone-50">
        Editar
      </Link>
      <button
        type="button"
        disabled={loading || esYo}
        title={esYo ? "No puede eliminar su propia cuenta desde aquí." : undefined}
        onClick={() => void eliminar()}
        className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-base font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Eliminando…" : "Eliminar"}
      </button>
      {err ? <span className="w-full text-sm text-red-800">{err}</span> : null}
    </div>
  );
}
