import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl, getSupabaseServiceRoleOrSecretKey } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Falta el identificador de usuario." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("is_owner").eq("id", user.id).maybeSingle();
  if (!prof?.is_owner) {
    return NextResponse.json({ error: "Solo los propietarios pueden eliminar usuarios." }, { status: 403 });
  }

  if (user.id === userId) {
    return NextResponse.json({ error: "No puede eliminar su propia cuenta desde aquí." }, { status: 400 });
  }

  const serviceKey = getSupabaseServiceRoleOrSecretKey();
  const url = getSupabaseProjectUrl();
  if (!serviceKey || !url) {
    return NextResponse.json(
      { error: "Falta clave de servidor (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY)." },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
