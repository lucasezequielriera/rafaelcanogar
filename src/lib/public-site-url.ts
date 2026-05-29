import { headers } from "next/headers";

/**
 * Origen absoluto (https://…) para enlaces y QR.
 * 1) `NEXT_PUBLIC_APP_URL` si la define (dominio definitivo o preview).
 * 2) Cabeceras de la petición (al abrir la app como la ve el usuario: localhost, *.vercel.app, etc.).
 * 3) `VERCEL_URL` en despliegues Vercel si no hubiera host en cabeceras.
 */
export async function getPublicSiteUrl(): Promise<string> {
  const fixed = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protoRaw = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = protoRaw === "http" || protoRaw === "https" ? protoRaw : "https";
  if (host) return `${proto}://${host}`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const clean = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${clean}`;
  }

  return "http://localhost:3000";
}
