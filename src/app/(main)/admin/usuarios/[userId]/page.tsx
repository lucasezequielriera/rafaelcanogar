import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { matrizPermisosVacia } from "@/lib/permisos-logica";
import type { PermisosTablaValor } from "@/components/PermisosTabla";
import type { RecursoKey } from "@/lib/recursos";
import { NombrePerfilDestinoForm } from "../NombrePerfilDestinoForm";
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
      <div className="space-y-6">
        <div>
          <Link href="/admin/usuarios" className="text-lg text-stone-600 underline">
            ← Usuarios
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">Propietario: {destProfile.nombre_completo ?? userId.slice(0, 8)}</h1>
          <p className="mt-2 text-stone-600">
            Los propietarios tienen acceso completo; no se gestionan permisos por área. Puede cambiar el <strong>nombre para mostrar</strong> en pantalla.
          </p>
        </div>
        <NombrePerfilDestinoForm userId={userId} nombreInicial={destProfile.nombre_completo} />
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
    <div className="space-y-8">
      <div>
        <Link href="/admin/usuarios" className="text-lg text-stone-600 underline">
          ← Usuarios
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Usuario de equipo: {destProfile.nombre_completo ?? userId.slice(0, 8)}</h1>
        <p className="mt-2 text-stone-600">
          Ajuste el nombre y los permisos por área. «Sin acceso» oculta la sección. «Importar CSV» solo aparece con permiso de importación en <strong>Ver y modificar</strong>.
        </p>
      </div>

      <NombrePerfilDestinoForm userId={userId} nombreInicial={destProfile.nombre_completo} />

      <PermisosEditorCliente userId={userId} inicial={inicial} />
    </div>
  );
}
