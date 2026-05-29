"use client";

import { useMemo, useState } from "react";

export type FilaAuditoriaUi = {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  fechaTexto: string;
  quien: string;
  accion: string;
  tipo: string;
  detalle: string;
  /** Texto en minúsculas para buscar palabra o fragmento */
  indiceBusqueda: string;
};

type Props = {
  filas: FilaAuditoriaUi[];
  /** Para ocupar el alto restante bajo el título (flex). */
  className?: string;
};

/** Líneas horizontales entre cada párrafo del detalle (p. ej. varios campos modificados). */
function DetalleConLineas({ texto }: { texto: string }) {
  const partes = texto
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (partes.length === 0) return <span className="text-stone-500">—</span>;
  if (partes.length === 1) return <span>{partes[0]}</span>;
  return (
    <div className="flex flex-col divide-y divide-stone-300">
      {partes.map((linea, i) => (
        <div key={i} className="py-2 first:pt-0 last:pb-0">
          {linea}
        </div>
      ))}
    </div>
  );
}

export function AuditoriaTablaCliente({ filas, className }: Props) {
  const [texto, setTexto] = useState("");
  const [actorFiltro, setActorFiltro] = useState("");

  const opcionesActores = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of filas) {
      if (f.actor_id) map.set(f.actor_id, f.quien);
    }
    return [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [filas]);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return filas.filter((f) => {
      if (actorFiltro && f.actor_id !== actorFiltro) return false;
      if (!q) return true;
      return f.indiceBusqueda.includes(q);
    });
  }, [filas, texto, actorFiltro]);

  return (
    <div className={["flex min-h-0 flex-1 flex-col gap-4", className].filter(Boolean).join(" ")}>
      <div className="shrink-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Buscar (palabra o letras)</span>
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ej.: obra, venta, nombre…"
              className="rounded-lg border border-stone-300 px-3 py-2 text-base outline-none ring-stone-400 focus:ring-2"
              autoComplete="off"
            />
          </label>
          <label className="flex min-w-[180px] flex-col gap-1.5 md:max-w-xs">
            <span className="text-sm font-medium text-stone-700">Usuario</span>
            <select
              value={actorFiltro}
              onChange={(e) => setActorFiltro(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-stone-400 focus:ring-2"
            >
              <option value="">Todos</option>
              {opcionesActores.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-stone-600 md:ml-auto md:pb-2">
            Mostrando <strong>{visibles.length}</strong> de {filas.length}
          </p>
        </div>
      </div>

      <div className="mb-8 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:mb-10">
        <div className="min-h-0 flex-1 basis-0 overflow-x-auto overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
          <table className="min-w-full border-collapse text-left text-sm md:text-base">
            <thead>
              <tr>
                {(["Fecha", "Quién", "Acción", "Tipo de registro", "Qué ocurrió"] as const).map((titulo) => (
                  <th
                    key={titulo}
                    scope="col"
                    className="sticky top-0 z-20 border-b border-stone-400 bg-stone-100 px-3 py-3 font-semibold text-stone-800 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.12)]"
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="min-h-[200px] border-b border-stone-400 px-3 py-8 text-center align-middle text-stone-600">
                    No hay registros que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="border-b border-stone-400 px-3 py-2 whitespace-nowrap">{f.fechaTexto}</td>
                    <td className="border-b border-stone-400 px-3 py-2">{f.quien}</td>
                    <td className="border-b border-stone-400 px-3 py-2">{f.accion}</td>
                    <td className="border-b border-stone-400 px-3 py-2">{f.tipo}</td>
                    <td className="border-b border-stone-400 px-3 py-2 max-w-xl text-stone-800">
                      <DetalleConLineas texto={f.detalle} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
