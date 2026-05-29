import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { puedeEscribir, puedeLeer } from "@/lib/permisos-logica";
import { getMatrizPermisosMiUsuario } from "@/lib/permisos-server";

export const dynamic = "force-dynamic";

const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

type Search = { [key: string]: string | string[] | undefined };

function numImporte(importe: unknown): number | null {
  if (importe == null || importe === "") return null;
  const n = Number(importe);
  return Number.isFinite(n) ? n : null;
}

function esMonedaEuro(m: string | null | undefined): boolean {
  const u = (m ?? "EUR").trim().toUpperCase();
  return u === "EUR" || u === "€" || u === "";
}

function fmtEuros(n: number): string {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function prefijoAnioMes(fecha: string): { anio: number; mes: number } | null {
  const s = String(fecha).slice(0, 7);
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null;
  return { anio, mes };
}

function ymFromFecha(fecha: string): string | null {
  const s = String(fecha).trim();
  if (s.length < 7) return null;
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sesionDash = await getMatrizPermisosMiUsuario();
  if (!sesionDash) redirect("/login");
  if (!puedeEscribir(sesionDash.niveles, "ventas", sesionDash.isOwner)) {
    if (puedeLeer(sesionDash.niveles, "ventas", sesionDash.isOwner)) redirect("/ventas");
    redirect("/sin-acceso");
  }

  const sp = await searchParams;
  const anioParam = typeof sp.anio === "string" ? Number.parseInt(sp.anio, 10) : NaN;
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const anioConsulta = Number.isFinite(anioParam) && anioParam >= 2000 && anioParam <= 2100 ? anioParam : anioActual;

  const añoInicio = `${anioConsulta}-01-01`;
  const añoFin = `${anioConsulta}-12-31`;

  const supabase = await createSupabaseServerClient();

  const [{ data: ventasAgg }, { data: ubiRows }, { count: countDisponible }, { count: countPrestamo }, { count: countVendido }] = await Promise.all([
    supabase.from("ventas").select("fecha_venta, cantidad, importe, moneda"),
    supabase.from("ubicaciones_ejemplar").select("fecha, tipo_movimiento"),
    supabase.from("ejemplares").select("id", { count: "exact", head: true }).eq("estado", "disponible"),
    supabase.from("ejemplares").select("id", { count: "exact", head: true }).eq("estado", "en_prestamo"),
    supabase.from("ejemplares").select("id", { count: "exact", head: true }).eq("estado", "vendido"),
  ]);

  const piezasDisponiblesAhora = countDisponible ?? 0;
  const piezasEnPrestamoAhora = countPrestamo ?? 0;
  const piezasVendidasAhora = countVendido ?? 0;

  const ventasPorYm = new Map<string, { unidades: number; euros: number; ventasEuro: number }>();

  const prefMesHoy = `${anioActual}-${String(mesActual).padStart(2, "0")}`;
  let totalMesEuros = 0;
  let ventasConPrecioMes = 0;

  type FilaAgg = { fecha_venta: string; importe: number | null; moneda: string | null; cuentaEuros: boolean };

  for (const r of ventasAgg ?? []) {
    const cant = typeof r.cantidad === "number" && r.cantidad > 0 ? r.cantidad : 1;
    const fecha = String(r.fecha_venta ?? "");
    const ym = ymFromFecha(fecha);
    const imp = numImporte(r.importe);
    const mon = r.moneda as string | null;
    const cuentaEuros = imp != null && esMonedaEuro(mon);

    if (ym) {
      const cur = ventasPorYm.get(ym) ?? { unidades: 0, euros: 0, ventasEuro: 0 };
      cur.unidades += cant;
      if (cuentaEuros && imp != null) {
        cur.euros += imp;
        cur.ventasEuro += 1;
      }
      ventasPorYm.set(ym, cur);
    }

    if (fecha.startsWith(prefMesHoy) && cuentaEuros && imp != null) {
      totalMesEuros += imp;
      ventasConPrecioMes += 1;
    }
  }

  const filasAggAnio: FilaAgg[] = [];
  for (const r of ventasAgg ?? []) {
    const fecha = String(r.fecha_venta ?? "");
    if (!fecha.startsWith(String(anioConsulta))) continue;
    const imp = numImporte(r.importe);
    const mon = r.moneda as string | null;
    filasAggAnio.push({
      fecha_venta: fecha,
      importe: imp,
      moneda: mon,
      cuentaEuros: imp != null && esMonedaEuro(mon),
    });
  }

  let totalAnioEuros = 0;
  let ventasConPrecioAnio = 0;
  const porMesEuros = new Map<number, number>();
  const porMesUnidadesVendidas = new Map<number, number>();
  for (let m = 1; m <= 12; m++) {
    porMesEuros.set(m, 0);
    porMesUnidadesVendidas.set(m, 0);
  }

  for (const f of filasAggAnio) {
    const am = prefijoAnioMes(f.fecha_venta);
    if (!am || am.anio !== anioConsulta) continue;
    if (f.cuentaEuros && f.importe != null) {
      totalAnioEuros += f.importe;
      ventasConPrecioAnio += 1;
      porMesEuros.set(am.mes, (porMesEuros.get(am.mes) ?? 0) + f.importe);
    }
  }

  for (const r of ventasAgg ?? []) {
    const fecha = String(r.fecha_venta ?? "");
    const am = prefijoAnioMes(fecha);
    if (!am || am.anio !== anioConsulta) continue;
    const cant = typeof r.cantidad === "number" && r.cantidad > 0 ? r.cantidad : 1;
    porMesUnidadesVendidas.set(am.mes, (porMesUnidadesVendidas.get(am.mes) ?? 0) + cant);
  }

  const sinPrecioAnio = filasAggAnio.filter((f) => f.importe == null).length;
  const otraMonedaAnio = filasAggAnio.filter((f) => f.importe != null && !f.cuentaEuros).length;

  /** Préstamos por mes: solo si existe columna `tipo_movimiento` en BD (migración 20250603); si no, queda en 0 y use el contador «En préstamo» arriba. */
  const prestamosPorYm = new Map<string, number>();
  for (const u of ubiRows ?? []) {
    const rec = u as { fecha: string; tipo_movimiento?: string | null };
    if (String(rec.tipo_movimiento ?? "").trim() !== "prestamo") continue;
    const fecha = String(rec.fecha ?? "");
    const ym = ymFromFecha(fecha);
    if (ym) prestamosPorYm.set(ym, (prestamosPorYm.get(ym) ?? 0) + 1);
  }

  const porMesPrestamos = new Map<number, number>();
  for (let m = 1; m <= 12; m++) {
    const ym = `${anioConsulta}-${String(m).padStart(2, "0")}`;
    porMesPrestamos.set(m, prestamosPorYm.get(ym) ?? 0);
  }

  const prestamosEsteMes = prestamosPorYm.get(prefMesHoy) ?? 0;

  /** Año en pantalla = año civil hoy: mes actual → enero. Otro año: diciembre → enero. */
  const mesesOrdenTabla: number[] =
    anioConsulta === anioActual
      ? Array.from({ length: mesActual }, (_, i) => mesActual - i)
      : Array.from({ length: 12 }, (_, i) => 12 - i);

  return (
    <div className="space-y-10 text-stone-900">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <span className="text-xl font-medium text-stone-500 tabular-nums">
          {MESES_ES[mesActual - 1]} {anioActual}
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Disponibles</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-900">{piezasDisponiblesAhora}</p>
          <p className="mt-2 text-sm text-stone-600">Ejemplares con estado «en la colección» (disponible): piezas que no figuran vendidas ni en préstamo.</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">En préstamo</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-950">{piezasEnPrestamoAhora}</p>
          <p className="mt-2 text-sm text-stone-600">Ejemplares con estado «en préstamo», normalmente tras registrar una anotación de tipo préstamo.</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Vendidas</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-800">{piezasVendidasAhora}</p>
          <p className="mt-2 text-sm text-stone-600">Ejemplares con estado «vendido» (hay al menos una venta registrada para esa pieza).</p>
        </div>
      </section>
 
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-900">Este mes ({MESES_ES[mesActual - 1]} {anioActual})</h2>
          <p className="mt-6 text-4xl font-semibold tabular-nums text-stone-900 md:text-5xl">{fmtEuros(totalMesEuros)}</p>
          <p className="mt-4 text-lg text-stone-600">
            {ventasConPrecioMes} venta{ventasConPrecioMes === 1 ? "" : "s"} con precio en euros este mes.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-900">Todo el año {anioConsulta}</h2>
          <p className="mt-6 text-4xl font-semibold tabular-nums text-stone-900 md:text-5xl">{fmtEuros(totalAnioEuros)}</p>
          <p className="mt-4 text-lg text-stone-600">
            {ventasConPrecioAnio} venta{ventasConPrecioAnio === 1 ? "" : "s"} sumadas en euros en {anioConsulta}.
          </p>
          {sinPrecioAnio > 0 ? (
            <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-base text-stone-700">
              Hay {sinPrecioAnio} venta{sinPrecioAnio === 1 ? "" : "s"} de este año <strong className="font-semibold">sin precio</strong>: no entran en la suma.
            </p>
          ) : null}
          {otraMonedaAnio > 0 ? (
            <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-base text-stone-700">
              Hay {otraMonedaAnio} venta{otraMonedaAnio === 1 ? "" : "s"} en <strong className="font-semibold">otra moneda</strong>: no se suman aquí.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-semibold text-stone-900">Ventas y préstamos por mes ({anioConsulta})</h2>
        <p className="mt-2 text-lg text-stone-600">
          <strong className="font-medium text-stone-800">Ventas</strong>: suma de unidades vendidas en ese mes. <strong className="font-medium text-stone-800">Préstamos</strong>: número de veces que
          se guardó una anotación con tipo «préstamo» (cada préstamo registrado cuenta uno).
        </p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2 font-medium text-stone-800">
            Año
            <input
              name="anio"
              type="number"
              min={2000}
              max={2100}
              defaultValue={anioConsulta}
              className="w-36 rounded-lg border border-stone-300 px-3 py-3 text-lg font-semibold"
            />
          </label>
          <button type="submit" className="rounded-xl bg-stone-900 px-5 py-3 text-lg font-medium text-white hover:bg-stone-800">
            Mostrar ese año
          </button>
        </form>
        <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-full text-left text-base">
            <thead className="bg-stone-100 text-stone-800">
              <tr>
                <th className="px-4 py-3">Mes</th>
                <th className="px-4 py-3 whitespace-nowrap">Ventas (€)</th>
                <th className="px-4 py-3 whitespace-nowrap">Ventas (unid.)</th>
                <th className="px-4 py-3 whitespace-nowrap">Préstamos (anot.)</th>
              </tr>
            </thead>
            <tbody>
              {mesesOrdenTabla.map((mes) => {
                const nombre = MESES_ES[mes - 1];
                const euros = porMesEuros.get(mes) ?? 0;
                const uds = porMesUnidadesVendidas.get(mes) ?? 0;
                const prest = porMesPrestamos.get(mes) ?? 0;
                return (
                  <tr key={mes} className="border-t border-stone-200">
                    <td className="px-4 py-3 font-medium">{nombre}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{fmtEuros(euros)}</td>
                    <td className="px-4 py-3 tabular-nums">{uds}</td>
                    <td className="px-4 py-3 tabular-nums text-stone-800">{prest}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-lg text-stone-600">
        ¿Necesita el detalle o buscar por nombre? Vaya a{" "}
        <Link href="/ventas" className="font-medium text-stone-900 underline">
          Ventas
        </Link>
        .
      </p>
    </div>
  );
}
