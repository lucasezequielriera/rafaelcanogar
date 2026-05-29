"use client";

export type EjemplarEdicionFilaPrefill = {
  etiqueta: string;
  notas: string;
  ultimaUbicacion: string;
  ultimaFecha: string;
};

type Props = {
  variant: "nueva" | "obra";
  cantidad: number;
  /** En ficha obra: cuántas filas corresponden a ejemplares ya guardados (orden creación ascendente). */
  existentesCount: number;
  /** Defaults por índice para las filas existentes (longitud = existentesCount). */
  prefills?: EjemplarEdicionFilaPrefill[];
};

const inputClase =
  "w-full min-w-0 rounded border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400";

/**
 * N filas compactas (etiqueta, ubicación, fecha, notas) alineadas con «Número de ejemplares de la edición».
 */
export function EjemplaresEdicionFilas({ variant, cantidad, existentesCount, prefills = [] }: Props) {
  if (cantidad <= 0) return null;

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="sm:col-span-2">
      <p className="text-sm font-medium text-stone-800">Cada ejemplar de la edición</p>
      <p className="mt-0.5 text-xs leading-snug text-stone-500">
        {variant === "nueva"
          ? "Una fila por pieza; debe coincidir con el número de ejemplares indicado arriba."
          : "Filas 1–N en orden de alta. Ubicación obligatoria solo en filas nuevas; en las ya guardadas, rellene solo si cambia el sitio."}
      </p>

      <div className="mt-2 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-xs font-medium uppercase tracking-wide text-stone-600">
              <th scope="col" className="w-10 px-2 py-2 text-center font-semibold normal-case">
                #
              </th>
              <th scope="col" className="px-2 py-2">
                Etiqueta <span className="text-red-600">*</span>
              </th>
              <th scope="col" className="px-2 py-2 min-w-[7rem]">
                Ubicación
              </th>
              <th scope="col" className="w-[8.5rem] px-2 py-2 whitespace-nowrap">
                Fecha
              </th>
              <th scope="col" className="min-w-[5rem] px-2 py-2">
                Notas
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cantidad }, (_, i) => {
              const pre = prefills[i];
              const esFilaNueva = variant === "nueva" || i >= existentesCount;
              const ubicacionRequerida = esFilaNueva;

              return (
                <tr key={i} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-2 py-1.5 text-center text-xs tabular-nums text-stone-500">{i + 1}</td>
                  <td className="px-2 py-1.5 align-middle">
                    <label className="sr-only" htmlFor={`ejemplar_${i}_etiqueta`}>
                      Etiqueta ejemplar {i + 1}
                    </label>
                    <input
                      id={`ejemplar_${i}_etiqueta`}
                      name={`ejemplar_${i}_etiqueta`}
                      required
                      defaultValue={pre?.etiqueta ?? ""}
                      autoComplete="off"
                      className={inputClase}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <label className="sr-only" htmlFor={`ejemplar_${i}_ubicacion`}>
                      Ubicación ejemplar {i + 1}
                    </label>
                    <input
                      id={`ejemplar_${i}_ubicacion`}
                      name={`ejemplar_${i}_ubicacion`}
                      required={ubicacionRequerida}
                      defaultValue={pre?.ultimaUbicacion ?? ""}
                      placeholder={ubicacionRequerida ? "Obligatoria" : "Si no cambia, vacío"}
                      autoComplete="off"
                      className={inputClase}
                      aria-required={ubicacionRequerida}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <label className="sr-only" htmlFor={`ejemplar_${i}_fecha`}>
                      Fecha ejemplar {i + 1}
                    </label>
                    <input
                      id={`ejemplar_${i}_fecha`}
                      name={`ejemplar_${i}_fecha`}
                      type="date"
                      defaultValue={pre?.ultimaFecha ?? hoy}
                      className={`${inputClase} tabular-nums`}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <label className="sr-only" htmlFor={`ejemplar_${i}_notas`}>
                      Notas ejemplar {i + 1}
                    </label>
                    <input
                      id={`ejemplar_${i}_notas`}
                      name={`ejemplar_${i}_notas`}
                      defaultValue={pre?.notas ?? ""}
                      placeholder="—"
                      autoComplete="off"
                      className={inputClase}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
