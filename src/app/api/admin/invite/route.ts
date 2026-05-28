import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RecursoKey } from "@/lib/recursos";

type PermBody = Partial<Record<RecursoKey, "ninguno" | "lectura" | "lectura_escritura">>;

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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." }, { status: 500 });
  }

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    nombre_completo?: string;
    permisos?: PermBody;
  };

  const email = body.email?.trim();
  const password = body.password;
  const nombre = body.nombre_completo?.trim();
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Correo y contraseña (mín. 8 caracteres) son obligatorios." }, { status: 400 });
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

  await admin.from("profiles").update({ nombre_completo: nombre ?? null }).eq("id", created.user.id);

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
