import Link from "next/link";
import { PAGE_SIZE_TABLAS, queryStringPreservando, totalPaginas } from "@/lib/paginacion";

type Props = {
  pathname: string;
  preserveParams: Record<string, string | undefined>;
  /** Página actual (1-based), ya acotada al rango válido. */
  page: number;
  totalItems: number;
  pageSize?: number;
  pageParam?: string;
};

export function PaginacionEnlaces({
  pathname,
  preserveParams,
  page,
  totalItems,
  pageSize = PAGE_SIZE_TABLAS,
  pageParam = "page",
}: Props) {
  const totalP = totalPaginas(totalItems, pageSize);
  const p = Math.min(Math.max(1, page), totalP);
  const from = totalItems === 0 ? 0 : (p - 1) * pageSize + 1;
  const to = Math.min(p * pageSize, totalItems);

  const href = (nuevaPagina: number) => `${pathname}${queryStringPreservando(preserveParams, nuevaPagina, pageParam)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/80 px-4 py-3 text-stone-700">
      <p className="text-sm">
        {totalItems === 0 ? "Sin resultados" : `Mostrando ${from}–${to} de ${totalItems}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500">
          Página {p} de {totalP}
        </span>
        {p > 1 ? (
          <Link
            href={href(p - 1)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100"
          >
            Anterior
          </Link>
        ) : null}
        {p < totalP ? (
          <Link
            href={href(p + 1)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100"
          >
            Siguiente
          </Link>
        ) : null}
      </div>
    </div>
  );
}
