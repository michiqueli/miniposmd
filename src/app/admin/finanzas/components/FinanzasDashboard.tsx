// src/app/admin/finanzas/components/FinanzasDashboard.tsx
// ─────────────────────────────────────────────
// Dashboard financiero: Centro de administración financiera
// Cards de resumen, desglose MP, gastos, ganancia real
// ─────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard,
  Wallet, ArrowUpRight, ArrowDownRight, AlertTriangle,
  Banknote, Building2, PiggyBank, Receipt, BarChart3,
  Minus,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import type { ResumenFinanzas, TipoPeriodo } from '@/lib/types'

type Props = {
  data: ResumenFinanzas
  periodo: TipoPeriodo
  mes: number
  anio: number
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const fmt = (n: number) =>
  `$${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

function TendenciaBadge({ valor }: { valor: number }) {
  if (valor === 0) return null
  const positivo = valor > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
      positivo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      {positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmtPct(valor)}
    </span>
  )
}

export default function FinanzasDashboard({ data, periodo, mes, anio }: Props) {
  const router = useRouter()
  const [periodoLocal, setPeriodoLocal] = useState<TipoPeriodo>(periodo)

  const navegar = (p: TipoPeriodo, m: number, a: number) => {
    router.push(`/admin/finanzas?periodo=${p}&mes=${m}&anio=${a}`)
  }

  return (
    <div className="space-y-6">
      {/* ── Selector de período ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {([
            { key: 'semana', label: 'Semana' },
            { key: 'mes', label: 'Mes' },
            { key: 'anio', label: 'Año' },
          ] as const).map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPeriodoLocal(p.key)
                navegar(p.key, mes, anio)
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                periodoLocal === p.key
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodoLocal !== 'semana' && (
          <>
            {periodoLocal === 'mes' && (
              <Select
                value={String(mes)}
                onChange={(e) => navegar(periodoLocal, parseInt(e.target.value), anio)}
                className="max-w-40"
              >
                {MESES.map((nombre, i) => (
                  <option key={i + 1} value={i + 1}>{nombre}</option>
                ))}
              </Select>
            )}
            <Select
              value={String(anio)}
              onChange={(e) => navegar(periodoLocal, mes, parseInt(e.target.value))}
              className="max-w-28"
            >
              {[2024, 2025, 2026, 2027].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </>
        )}

        <span className="text-sm text-slate-500 font-medium">{data.periodoLabel}</span>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 1: Resumen General                    */}
      {/* ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ingresos totales */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
              <TrendingUp size={22} />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ingresos Totales</span>
              {data.tendencia && <TendenciaBadge valor={data.tendencia.variacionIngresos} />}
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">{fmt(data.totalIngresos)}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Efectivo: {fmt(data.ingresosEfectivo)}</span>
            <span>MP: {fmt(data.ingresosMPBruto)}</span>
          </div>
        </Card>

        {/* Gastos totales */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 p-2.5 rounded-xl text-red-600">
              <TrendingDown size={22} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gastos Totales</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{fmt(data.totalGastos)}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Efectivo: {fmt(data.gastosEfectivo)}</span>
            <span>Transf: {fmt(data.gastosTransferencia)}</span>
            {data.gastosTarjeta > 0 && <span>Tarjeta: {fmt(data.gastosTarjeta)}</span>}
          </div>
        </Card>

        {/* Ganancia real */}
        <Card className={`p-5 border-2 ${
          data.gananciaReal >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              data.gananciaReal >= 0
                ? 'bg-emerald-200 text-emerald-700'
                : 'bg-red-200 text-red-700'
            }`}>
              <PiggyBank size={22} />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ganancia Real</span>
              {data.tendencia && <TendenciaBadge valor={data.tendencia.variacionGanancia} />}
            </div>
          </div>
          <p className={`text-3xl font-black ${
            data.gananciaReal >= 0 ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {data.gananciaReal >= 0 ? '+' : '-'}{fmt(data.gananciaReal)}
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Margen: {data.margenPorcentaje}% sobre ingresos netos
          </p>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 2: Caja Efectivo + Saldo MP           */}
      {/* ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Caja Efectivo */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2.5 rounded-xl text-green-600">
              <Banknote size={22} />
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase">Caja Efectivo</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ventas en efectivo</span>
              <span className="font-semibold text-emerald-600">+{fmt(data.ingresosEfectivo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastos en efectivo</span>
              <span className="font-semibold text-red-600">-{fmt(data.gastosEfectivo)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-bold text-slate-700">Saldo en caja</span>
                <span className={`text-xl font-black ${
                  data.saldoCajaEfectivo >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {fmt(data.saldoCajaEfectivo)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Saldo MP */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-sky-100 p-2.5 rounded-xl text-sky-600">
              <Building2 size={22} />
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase">Saldo Mercado Pago</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cobrado bruto</span>
              <span className="text-slate-600">{fmt(data.ingresosMPBruto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Comisiones MP</span>
              <span className="font-semibold text-red-500">-{fmt(data.totalComisionMP)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">SIRTAC Neuquén</span>
              <span className="font-semibold text-red-500">-{fmt(data.totalSirtac)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Neto recibido</span>
              <span className="font-semibold text-emerald-600">+{fmt(data.ingresosMPNeto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastos por transferencia</span>
              <span className="font-semibold text-red-600">-{fmt(data.gastosTransferencia)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-bold text-slate-700">Saldo estimado</span>
                <span className={`text-xl font-black ${
                  data.saldoEstimadoMP >= 0 ? 'text-sky-700' : 'text-red-700'
                }`}>
                  {fmt(data.saldoEstimadoMP)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 3: Desglose Comisiones MP por tipo    */}
      {/* ══════════════════════════════════════════════ */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-violet-100 p-2.5 rounded-xl text-violet-600">
            <CreditCard size={22} />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-700 uppercase">Comisiones MP por Tipo de Cobro</span>
            <p className="text-xs text-slate-400">
              {data.cantOpsMP} operaciones · Comisiones totales: {fmt(data.totalDescuentosMP)} ({data.porcentajeComisionesTotal}%)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-xs">
              <tr>
                <th className="px-3 py-3">Medio de pago</th>
                <th className="px-3 py-3 text-center">Ops</th>
                <th className="px-3 py-3 text-right">Bruto</th>
                <th className="px-3 py-3 text-right">Comisión MP</th>
                <th className="px-3 py-3 text-center">%</th>
                <th className="px-3 py-3 text-right">SIRTAC</th>
                <th className="px-3 py-3 text-center">%</th>
                <th className="px-3 py-3 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {data.desgloseMPTipos.map((d) => (
                <tr key={d.tipo} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium">{d.label}</td>
                  <td className="px-3 py-2.5 text-center">{d.cantOps}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(d.bruto)}</td>
                  <td className="px-3 py-2.5 text-right text-red-600 font-medium">-{fmt(d.comisionMP)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{d.tasaMP}%</td>
                  <td className="px-3 py-2.5 text-right text-orange-600 font-medium">-{fmt(d.sirtac)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{d.tasaSirtac}%</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{fmt(d.neto)}</td>
                </tr>
              ))}
              {data.desgloseMPTipos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No hay operaciones MP en este período.
                  </td>
                </tr>
              )}
            </tbody>
            {data.desgloseMPTipos.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-sm">
                <tr>
                  <td className="px-3 py-3">TOTALES</td>
                  <td className="px-3 py-3 text-center">{data.cantOpsMP}</td>
                  <td className="px-3 py-3 text-right">{fmt(data.ingresosMPBruto)}</td>
                  <td className="px-3 py-3 text-right text-red-700">-{fmt(data.totalComisionMP)}</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-500">
                    {data.ingresosMPBruto > 0 ? ((data.totalComisionMP / data.ingresosMPBruto) * 100).toFixed(2) : 0}%
                  </td>
                  <td className="px-3 py-3 text-right text-orange-700">-{fmt(data.totalSirtac)}</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-500">
                    {data.ingresosMPBruto > 0 ? ((data.totalSirtac / data.ingresosMPBruto) * 100).toFixed(2) : 0}%
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-700">{fmt(data.ingresosMPNeto)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 4: Gastos por método y categoría      */}
      {/* ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gastos por método */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
              <Wallet size={22} />
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase">Gastos por Método</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Efectivo', monto: data.gastosEfectivo, color: 'bg-green-500' },
              { label: 'Transferencia', monto: data.gastosTransferencia, color: 'bg-sky-500' },
              { label: 'Tarjeta', monto: data.gastosTarjeta, color: 'bg-violet-500' },
            ].filter((g) => g.monto > 0).map((g) => {
              const pct = data.totalGastos > 0 ? (g.monto / data.totalGastos) * 100 : 0
              return (
                <div key={g.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{g.label}</span>
                    <span className="font-semibold">{fmt(g.monto)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${g.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {data.totalGastos === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sin gastos registrados</p>
            )}
          </div>
        </Card>

        {/* Gastos por categoría */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600">
              <Receipt size={22} />
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase">Gastos por Categoría</span>
          </div>
          <div className="space-y-2">
            {data.gastosPorCategoria.map((g) => (
              <div key={g.categoria} className="flex justify-between text-sm">
                <span className="text-slate-600">{g.categoria}</span>
                <span className="font-semibold">{fmt(g.monto)}</span>
              </div>
            ))}
            {data.gastosPorCategoria.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sin gastos registrados</p>
            )}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 5: Resumen Final                      */}
      {/* ══════════════════════════════════════════════ */}
      <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-white/10 p-2.5 rounded-xl">
            <BarChart3 size={22} />
          </div>
          <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Resumen Financiero · {data.periodoLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda: ingresos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ingresos</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Efectivo</span>
              <span className="font-semibold">{fmt(data.ingresosEfectivo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">MP neto (post comisiones)</span>
              <span className="font-semibold">{fmt(data.ingresosMPNeto)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-300">Total ingresos reales</span>
                <span className="font-bold text-emerald-400">
                  {fmt(data.ingresosEfectivo + data.ingresosMPNeto)}
                </span>
              </div>
            </div>
          </div>

          {/* Columna derecha: descuentos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Descuentos</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total gastos</span>
              <span className="font-semibold text-red-400">-{fmt(data.totalGastos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Comisiones MP</span>
              <span className="font-semibold text-red-400">-{fmt(data.totalComisionMP)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">SIRTAC Neuquén</span>
              <span className="font-semibold text-red-400">-{fmt(data.totalSirtac)}</span>
            </div>
          </div>
        </div>

        {/* Línea final: ganancia */}
        <div className="mt-6 pt-4 border-t-2 border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Ganancia Real del Negocio</p>
              <p className={`text-4xl font-black ${
                data.gananciaReal >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {data.gananciaReal >= 0 ? '+' : '-'}{fmt(data.gananciaReal)}
                <span className="text-lg ml-2 text-slate-400">({data.margenPorcentaje}%)</span>
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">En caja</p>
                <p className="font-bold text-lg">{fmt(data.saldoCajaEfectivo)}</p>
              </div>
              <div className="text-slate-600"><Minus size={16} className="mt-5" /></div>
              <div>
                <p className="text-xs text-slate-500 mb-1">En MP</p>
                <p className="font-bold text-lg text-sky-400">{fmt(data.saldoEstimadoMP)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 6: Alertas                            */}
      {/* ══════════════════════════════════════════════ */}
      {data.alertas.length > 0 && (
        <div className="space-y-3">
          {data.alertas.map((alerta, i) => (
            <Card key={i} className="p-4 border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">{alerta}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Tendencia con período anterior ── */}
      {data.tendencia && (
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
              <DollarSign size={18} />
            </div>
            <span className="text-sm font-bold text-slate-600 uppercase">Comparación con período anterior</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Ingresos anterior</p>
              <p className="font-semibold">{fmt(data.tendencia.ingresosAnterior)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Ingresos actual</p>
              <p className="font-semibold">{fmt(data.totalIngresos)}</p>
              <TendenciaBadge valor={data.tendencia.variacionIngresos} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Ganancia anterior</p>
              <p className="font-semibold">{fmt(data.tendencia.gananciaAnterior)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Ganancia actual</p>
              <p className="font-semibold">{fmt(data.gananciaReal)}</p>
              <TendenciaBadge valor={data.tendencia.variacionGanancia} />
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
