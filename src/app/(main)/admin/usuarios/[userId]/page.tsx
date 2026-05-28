import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { matrizPermisosVacia } from "@/lib/permisos-logica";
import type { PermisosTablaValor } from "@/components/PermisosTabla";
import type { RecursoKey } from "@/lib/recursos";
import { PermisosEditorCliente } from "../PermisosEditorCliente";

type Props = { params: Promise<{ userId: string }> };

export default async function EditarPermisosUsuarioPage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: yo } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!yo?.is_owner) redirect("/obras");

  const { data: destProfile } = await supabase.from("profiles").select("nombre_completo, is_owner").eq("id", userId).maybeSingle();
  if (!destProfile) notFound();
  if (destProfile.is_owner) {
    return (
      <div className="space-y-4">
        <Link href="/admin/usuarios" className="text-lg text-stone-600 underline">
          ← Usuarios
        </Link>
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-lg text-stone-700">
          Los propietarios tienen acceso completo; no se gestionan permisos por filas para esta cuenta.
        </p>
      </div>
    );
  }

  const { data: filas } = await supabase.from("permisos_usuario").select("recurso, nivel").eq("user_id", userId);

  const inicial = matrizPermisosVacia() as unknown as PermisosTablaValor;
  for (const f of filas ?? []) {
    const k = f.recurso as RecursoKey;
    if (k in inicial && f.nivel) inicial[k] = f.nivel;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/usuarios" className="text-lg text-stone-600 underline">
          ← Usuarios
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Permisos de {destProfile.nombre_completo ?? userId.slice(0, 8)}</h1>
        <p className="mt-2 text-stone-600">
          Áreas con «Sin acceso» no aparecerán en el menú. «Importar CSV» solo se muestra si el permiso de importación está en{" "}
          <strong>Ver y modificar</strong>.
        </p>
      </div>

      <PermisosEditorCliente userId={userId} inicial={inicial} />
    </div>
  );
}
