"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function nuevoToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Buffer.from(a).toString("base64url");
}

export async function asegurarPublicFichaToken(obraId: string): Promise<{ error?: string; token?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: row, error: readErr } = await supabase.from("obras").select("public_ficha_token").eq("id", obraId).maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!row) return { error: "No se encontró la obra o no tiene permiso." };

  let token = (row as { public_ficha_token?: string | null }).public_ficha_token ?? null;
  if (!token) {
    for (let i = 0; i < 5; i++) {
      token = nuevoToken();
      const { error: upErr } = await supabase.from("obras").update({ public_ficha_token: token }).eq("id", obraId);
      if (!upErr) break;
      if (!String(upErr.message).includes("duplicate") && !String(upErr.message).includes("unique")) {
        return { error: upErr.message };
      }
      token = null;
    }
    if (!token) return { error: "No se pudo generar un enlace único. Inténtelo de nuevo." };
  }

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/p/${token}`);
  return { token };
}

export async function rotarPublicFichaToken(obraId: string): Promise<{ error?: string; token?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: row, error: readErr } = await supabase.from("obras").select("id").eq("id", obraId).maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!row) return { error: "No se encontró la obra o no tiene permiso." };

  let token: string | null = null;
  for (let i = 0; i < 5; i++) {
    const candidate = nuevoToken();
    const { error: upErr } = await supabase.from("obras").update({ public_ficha_token: candidate }).eq("id", obraId);
    if (!upErr) {
      token = candidate;
      break;
    }
    if (!String(upErr.message).includes("duplicate") && !String(upErr.message).includes("unique")) {
      return { error: upErr.message };
    }
  }
  if (!token) return { error: "No se pudo regenerar el enlace. Inténtelo de nuevo." };

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/p/${token}`);
  return { token };
}
