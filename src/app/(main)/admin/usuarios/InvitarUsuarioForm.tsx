"use client";

import { useState } from "react";
import { PermisosTabla, permisosVacios, type PermisosTablaValor } from "@/components/PermisosTabla";
import {
  presetEquipoOperacion,
  presetEquipoOperacionPlus,
  presetEquipoSoloLectura,
} from "@/lib/permisos-presets";

type TipoCuenta = "propietario" | "equipo";

export function InvitarUsuarioForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>("equipo");
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
      const esPropietario = tipoCuenta === "propietario";
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nombre_completo: nombre,
          es_propietario: esPropietario,
          permisos: esPropietario ? {} : permisos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Error");
        return;
      }
      setMsg(
        esPropietario
          ? "Propietario creado: acceso total (incluye Usuarios). Ya puede iniciar sesión."
          : "Usuario de equipo creado con los permisos indicados. Ya puede iniciar sesión."
      );
      setEmail("");
      setPassword("");
      setNombre("");
      setTipoCuenta("equipo");
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

      <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/50 p-6">
        <legend className="text-xl font-semibold">Tipo de cuenta</legend>
        <p className="text-stone-600">
          <strong>Propietario</strong>: igual que usted — todo el sistema y <strong>Usuarios</strong> (crear cuentas y permisos). Use para copropietarios o máxima responsabilidad.
        </p>
        <p className="text-stone-600">
          <strong>Equipo</strong> (secretaría, empleados): sin menú Usuarios; usted elige área a área si solo ven o si pueden modificar.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 has-[:checked]:border-amber-600 has-[:checked]:ring-2 has-[:checked]:ring-amber-200">
            <input type="radio" name="tipo" checked={tipoCuenta === "propietario"} onChange={() => setTipoCuenta("propietario")} />
            <span className="font-medium">Propietario</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 has-[:checked]:border-amber-600 has-[:checked]:ring-2 has-[:checked]:ring-amber-200">
            <input type="radio" name="tipo" checked={tipoCuenta === "equipo"} onChange={() => setTipoCuenta("equipo")} />
            <span className="font-medium">Equipo (permisos por área)</span>
          </label>
        </div>
      </fieldset>

      {tipoCuenta === "equipo" ? (
        <fieldset className="space-y-3">
          <legend className="text-xl font-semibold">Permisos por área</legend>
          <p className="text-stone-600">
            «Sin acceso» oculta la sección. «Ver» solo lectura. «Ver y modificar» permite crear y editar. La sección <strong>Usuarios</strong> solo la tienen los propietarios; aquí puede dar acceso a <strong>Historial</strong> o <strong>Importar CSV</strong> si aplica.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-sm font-medium text-stone-700">Plantillas (luego puede afinar):</span>
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base hover:bg-stone-50"
              onClick={() => setPermisos(presetEquipoSoloLectura() as PermisosTablaValor)}
            >
              Solo lectura (catálogo)
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base hover:bg-stone-50"
              onClick={() => setPermisos(presetEquipoOperacion() as PermisosTablaValor)}
            >
              Operación (editar datos)
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base hover:bg-stone-50"
              onClick={() => setPermisos(presetEquipoOperacionPlus() as PermisosTablaValor)}
            >
              Operación + importar + historial
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base hover:bg-stone-50"
              onClick={() => setPermisos(permisosVacios())}
            >
              Desde cero
            </button>
          </div>
          <PermisosTabla valor={permisos} onChange={setPermisos} />
        </fieldset>
      ) : (
        <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-stone-800">
          No hace falta tabla de permisos: los propietarios tienen acceso completo a todas las áreas y a <strong>Usuarios</strong>.
        </p>
      )}

      <button type="submit" disabled={loading} className="rounded-xl bg-stone-900 px-6 py-4 text-lg text-white disabled:opacity-60">
        {loading ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}
