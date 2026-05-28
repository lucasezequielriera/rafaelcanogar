import Link from "next/link";

export default function SinAccesoPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-10 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Sin permiso</h1>
      <p className="text-lg text-stone-700">
        No tiene acceso a esta sección. Si necesita ver o modificar datos, pídale a un propietario (Rafael o Susana) que ajuste sus
        permisos en <strong>Usuarios</strong>.
      </p>
      <Link href="/obras" className="inline-block rounded-xl bg-stone-900 px-6 py-3 text-lg text-white">
        Volver a obras
      </Link>
    </div>
  );
}
