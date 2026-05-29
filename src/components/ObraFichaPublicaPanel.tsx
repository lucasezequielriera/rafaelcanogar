"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { asegurarPublicFichaToken, rotarPublicFichaToken } from "@/app/actions/ficha-publica";

type Props = {
  obraId: string;
  publicOrigin: string;
  tokenInicial: string | null;
};

export function ObraFichaPublicaPanel({ obraId, publicOrigin, tokenInicial }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = tokenInicial ? `${publicOrigin}/p/${encodeURIComponent(tokenInicial)}` : null;
  const qrSrc = url ? `/api/qr?d=${encodeURIComponent(url)}` : null;

  async function onActivar() {
    setPending(true);
    setError(null);
    const r = await asegurarPublicFichaToken(obraId);
    setPending(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  async function onRotar() {
    if (!confirm("Se invalidará el QR y el enlace anteriores. ¿Continuar?")) return;
    setPending(true);
    setError(null);
    const r = await rotarPublicFichaToken(obraId);
    setPending(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-stone-600">
        Cualquiera con el enlace o el código QR puede abrir una página con datos públicos de la obra (sin precio ni comentarios internos). Guarde la migración en Supabase para activar la columna{" "}
        <code className="rounded bg-stone-100 px-1 text-sm">public_ficha_token</code>.
      </p>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {!tokenInicial ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void onActivar()}
          className="rounded-xl bg-amber-900 px-5 py-3 text-lg font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending ? "Generando…" : "Activar enlace y QR"}
        </button>
      ) : (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-xl border border-stone-200 bg-stone-50 p-3">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt="Código QR de la ficha pública" width={240} height={240} className="h-60 w-60 object-contain" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm font-medium text-stone-700">Enlace para el cliente</p>
            <p className="break-all rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-sm text-stone-800">
              <a href={url ?? "#"} className="underline hover:text-stone-950" target="_blank" rel="noreferrer">
                {url}
              </a>
            </p>
            <p className="text-sm text-stone-500">Puede copiar el enlace, imprimir el QR desde el navegador (clic derecho en la imagen) o añadirlo a una etiqueta física.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => void onRotar()}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
              >
                {pending ? "Actualizando…" : "Regenerar enlace y QR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
