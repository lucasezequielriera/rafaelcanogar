import Link from "next/link";

export default function SinAccesoPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-10 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Sin permiso</h1>
      <p className="text-lg text-stone-700">
        No tiene acceso a esta sección. Si otra persona administra el sistema, que un <strong>propietario</strong> abra{" "}
        <strong>Usuarios</strong> y ajuste sus permisos. Si usted es quien creó el proyecto y aún no ejecutó el SQL de propietarios en
        Supabase, véalo en <code className="rounded bg-stone-200 px-1.5 py-0.5 text-base">README</code> y en{" "}
        <code className="rounded bg-stone-200 px-1.5 py-0.5 text-base">supabase/seed_propietarios.sql</code>.
      </p>
      <Link href="/" className="inline-block rounded-xl bg-stone-900 px-6 py-3 text-lg text-white">
        Volver al inicio
      </Link>
    </div>
  );
}
