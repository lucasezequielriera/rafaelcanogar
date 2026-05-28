"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : err.message);
        return;
      }
      router.refresh();
      router.push("/obras");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight text-stone-900">
        Sistema Canogar
      </h1>
      <p className="mb-10 text-center text-lg text-stone-600">
        Inventario de obras. Acceso restringido.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <label className="flex flex-col gap-2">
          <span className="text-base font-medium text-stone-800">Correo electrónico</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none ring-stone-400 focus:ring-2"
            placeholder="nombre@ejemplo.com"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-base font-medium text-stone-800">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none ring-stone-400 focus:ring-2"
          />
        </label>
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-stone-900 px-4 py-4 text-lg font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
