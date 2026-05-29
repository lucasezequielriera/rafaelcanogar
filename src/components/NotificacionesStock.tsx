"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ObraAgotada = { id: string; numero_catalogo: string; nombre: string; unidades_totales: number };

export type InfoUltimaVenta = {
  obraId: string;
  numero_catalogo: string;
  nombre: string;
  disponibles: number;
  totales: number;
  fecha_venta: string;
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NotificacionesStock({
  agotadas,
  infoUltimaVenta,
}: {
  agotadas: ObraAgotada[];
  infoUltimaVenta: InfoUltimaVenta | null;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const totalAvisos = agotadas.length + (infoUltimaVenta ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Avisos de ejemplares disponibles"
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {totalAvisos > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-xs font-semibold text-white">
            {totalAvisos > 9 ? "9+" : totalAvisos}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-stone-200 bg-white py-3 shadow-lg"
          role="menu"
        >
          <p className="border-b border-stone-200 px-4 pb-2 text-sm font-semibold text-stone-900">Avisos de ejemplares</p>
          <div className="max-h-[70vh] overflow-y-auto px-2 pt-2">
            {agotadas.length > 0 ? (
              <div className="mb-4 rounded-lg border border-stone-300 border-l-4 border-l-stone-900 bg-stone-100 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Sin unidades disponibles</p>
                <ul className="mt-2 space-y-2">
                  {agotadas.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/obras/${o.id}`}
                        className="block rounded-md px-1 py-1 text-sm text-stone-900 hover:bg-stone-200/80"
                        onClick={() => setOpen(false)}
                      >
                        <span className="font-medium">Cat. {o.numero_catalogo}</span> — {o.nombre}
                        <span className="mt-0.5 block text-xs text-stone-600">
                          Edición de {o.unidades_totales} ejemplares · ninguno disponible
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {infoUltimaVenta ? (
              <div className="rounded-lg border border-stone-200 border-l-4 border-l-stone-300 bg-white px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Tras la última venta</p>
                <p className="mt-2 text-sm text-stone-800">
                  <Link
                    href={`/obras/${infoUltimaVenta.obraId}`}
                    className="font-medium text-stone-900 underline"
                    onClick={() => setOpen(false)}
                  >
                    Cat. {infoUltimaVenta.numero_catalogo} — {infoUltimaVenta.nombre}
                  </Link>
                </p>
                <p className="mt-2 text-sm text-stone-700">
                  Quedan <strong className="font-semibold text-stone-900">{infoUltimaVenta.disponibles}</strong> ejemplares disponibles de{" "}
                  <strong className="font-semibold text-stone-900">{infoUltimaVenta.totales}</strong> previstos en la edición (venta del{" "}
                  {infoUltimaVenta.fecha_venta}).
                </p>
              </div>
            ) : null}

            {agotadas.length === 0 && !infoUltimaVenta ? (
              <p className="px-3 py-4 text-sm text-stone-600">
                No hay avisos. Solo aparecen cuando la obra tiene fijado un número de ejemplares de la edición (más de cero); si no se indica, no se controla cuántos quedan.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
