import QRCode from "qrcode";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonOrPublishableKey, getSupabaseProjectUrl } from "@/lib/supabase/env";

/** Genera PNG de QR; solo URLs de ficha pública (`/p/...`) del mismo host. Requiere sesión (staff). */
export async function GET(request: NextRequest) {
  const d = request.nextUrl.searchParams.get("d");
  if (!d || d.length > 2048) {
    return NextResponse.json({ error: "Parámetro d inválido." }, { status: 400 });
  }

  let u: URL;
  try {
    u = new URL(d);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (!u.pathname.startsWith("/p/") || u.pathname.length < 4) {
    return NextResponse.json({ error: "Solo se permiten enlaces de ficha pública." }, { status: 400 });
  }

  const url = getSupabaseProjectUrl();
  const anon = getSupabaseAnonOrPublishableKey();
  if (!url || !anon) {
    return NextResponse.json({ error: "Configuración incompleta." }, { status: 500 });
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const buf = await QRCode.toBuffer(d, { type: "png", width: 240, margin: 2, errorCorrectionLevel: "M" });
  const bytes = new Uint8Array(buf.length);
  bytes.set(buf);
  return new NextResponse(new Blob([bytes], { type: "image/png" }), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}
