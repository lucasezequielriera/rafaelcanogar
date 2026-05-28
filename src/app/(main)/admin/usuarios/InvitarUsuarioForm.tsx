"use client";

import { useState } from "react";
import { PermisosTabla, permisosVacios, type PermisosTablaValor } from "@/components/PermisosTabla";

export function InvitarUsuarioForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [permisos, setPermisos] = useState<PermisosTablaValor>(permisosVacios);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nombre_completo: nombre, permisos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Error");
        return;
      }
      setMsg("Usuario creado. Ya puede iniciar sesión con el correo y la contraseña indicados.");
      setEmail("");
      setPassword("");
      setNombre("");
      setPermisos(permisosVacios());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      {err ? <p className="rounded-lg bg-red-50 px-4 py-3 text-red-900">{err}</p> : null}
      {msg ? <p className="rounded-lg bg-green-50 px-4 py-3 text-green-900">{msg}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-medium">Correo (será el usuario de acceso)</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border px-3 py-3 text-lg" />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-medium">Contraseña inicial (mín. 8 caracteres)</span>
          <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border px-3 py-3 text-lg" />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-medium">Nombre para mostrar</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="rounded-lg border px-3 py-3 text-lg" />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold">Permisos por área</legend>
        <p className="text-stone-600">«Sin acceso» no verá esa sección. «Ver» solo lectura. «Ver y modificar» edición completa en esa área.</p>
        <PermisosTabla valor={permisos} onChange={setPermisos} />
      </fieldset>

      <button type="submit" disabled={loading} className="rounded-xl bg-stone-900 px-6 py-4 text-lg text-white disabled:opacity-60">
        {loading ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}
