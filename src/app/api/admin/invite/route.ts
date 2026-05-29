import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseProjectUrl,
  getSupabaseServiceRoleOrSecretKey,
} from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RecursoKey } from "@/lib/recursos";

type PermBody = Partial<Record<RecursoKey, "ninguno" | "lectura" | "lectura_escritura">>;

function permisosTienenAlgunAcceso(permisos: PermBody | undefined): boolean {
  return Object.values(permisos ?? {}).some((n) => n === "lectura" || n === "lectura_escritura");
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!prof?.is_owner) {
    return NextResponse.json({ error: "Solo los propietarios pueden crear usuarios." }, { status: 403 });
  }

  const serviceKey = getSupabaseServiceRoleOrSecretKey();
  const url = getSupabaseProjectUrl();
  if (!serviceKey || !url) {
    return NextResponse.json(
      {
        error:
          "Falta clave de servidor en el entorno: SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY (y NEXT_PUBLIC_SUPABASE_URL).",
      },
      { status: 500 }
    );
  }

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    nombre_completo?: string;
    /** Si true: acceso total (propietario). Si false: equipo con permisos por área. */
    es_propietario?: boolean;
    permisos?: PermBody;
  };

  const email = body.email?.trim();
  const password = body.password;
  const nombre = body.nombre_completo?.trim();
  const esPropietario = Boolean(body.es_propietario);

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Correo y contraseña (mín. 8 caracteres) son obligatorios." }, { status: 400 });
  }

  if (!esPropietario && !permisosTienenAlgunAcceso(body.permisos)) {
    return NextResponse.json(
      {
        error:
          "Cuenta de equipo: marque al menos un área con «Ver» o «Ver y modificar», o elija «Propietario» si debe tener acceso total.",
      },
      { status: 400 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre_completo: nombre ?? email },
  });

  if (cErr || !created.user) {
    return NextResponse.json({ error: cErr?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }

  const { error: profErr } = await admin
    .from("profiles")
    .update({ nombre_completo: nombre ?? null, is_owner: esPropietario })
    .eq("id", created.user.id);

  if (profErr) {
    return NextResponse.json({ error: `Usuario creado pero falló el perfil: ${profErr.message}` }, { status: 500 });
  }

  if (esPropietario) {
    return NextResponse.json({ ok: true, userId: created.user.id });
  }

  const permisos = body.permisos ?? {};
  const rows = (Object.entries(permisos) as [RecursoKey, string][])
    .filter(([, nivel]) => nivel && nivel !== "ninguno")
    .map(([recurso, nivel]) => ({
      user_id: created.user.id,
      recurso,
      nivel,
    }));

  if (rows.length) {
    const { error: pErr } = await admin.from("permisos_usuario").insert(rows);
    if (pErr) {
      return NextResponse.json({ error: `Usuario creado pero falló permisos: ${pErr.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, userId: created.user.id });
}
