"use client";

import { matrizPermisosVacia } from "@/lib/permisos-logica";
import { NIVELES, RECURSOS, type RecursoKey } from "@/lib/recursos";

export type PermisosTablaValor = Record<RecursoKey, string>;

type Props = {
  valor: PermisosTablaValor;
  onChange: (siguiente: PermisosTablaValor) => void;
  prefijoName?: string;
  /** Si true, emite <input type="hidden"> para enviar en form server action */
  modoFormulario?: boolean;
};

export function permisosVacios(): PermisosTablaValor {
  return matrizPermisosVacia() as PermisosTablaValor;
}

export function PermisosTabla({ valor, onChange, prefijoName = "perm", modoFormulario }: Props) {
  return (
    <div className="overflow-x-auto">
      {modoFormulario
        ? RECURSOS.map((r) => (
            <input key={r.key} type="hidden" name={`${prefijoName}_${r.key}`} value={valor[r.key]} />
          ))
        : null}
      <table className="min-w-full border-collapse text-base">
        <thead>
          <tr className="border-b border-stone-200 text-left">
            <th className="py-2 pr-4">Área</th>
            {NIVELES.map((n) => (
              <th key={n.key} className="py-2 px-2">
                {n.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RECURSOS.map((r) => (
            <tr key={r.key} className="border-b border-stone-100">
              <td className="py-3 pr-4 font-medium">{r.label}</td>
              {NIVELES.map((n) => (
                <td key={n.key} className="px-2 text-center">
                  <input
                    type="radio"
                    name={modoFormulario ? `${prefijoName}_${r.key}_ui` : `perm-${r.key}`}
                    checked={valor[r.key] === n.key}
                    onChange={() => {
                      const siguiente = { ...valor, [r.key]: n.key };
                      onChange(siguiente);
                    }}
                    aria-label={`${r.label} ${n.label}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
