// src/app/admin/contable/components/ContableDashboard.tsx
// ─────────────────────────────────────────────
// Dashboard contable con tabs: Posición IVA | Libro Ventas | Libro Compras
// ─────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, FileText, DollarSign, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import type { ResumenIVA, FilaLibroIVAVentas, FilaLibroIVACompras } from '@/lib/types'

type Props = {
  mes: number
  anio: number
  resumen: ResumenIVA
  ventas: FilaLibroIVAVentas[]
  compras: FilaLibroIVACompras[]
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type Tab = 'resumen' | 'ventas' | 'compras'

export default function ContableDashboard({ mes, anio, resumen, ventas, compras }: Props) {
  const [tab, setTab] = useState<Tab>('resumen')
  const router = useRouter()

  const cambiarPeriodo = (nuevoMes: string, nuevoAnio: string) => {
    router.push(`/admin/contable?mes=${nuevoMes}&anio=${nuevoAnio}`)
  }

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      {/* ── Selector de período ── */}
      <div className="flex items-center gap-3">
        <Select
          value={String(mes)}
          onChange={(e) => cambiarPeriodo(e.target.value, String(anio))}
          className="max-w-40"
        >
          {MESES.map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </Select>
        <Select
          value={String(anio)}
          onChange={(e) => cambiarPeriodo(String(mes), e.target.value)}
          className="max-w-28"
        >
          {[2024, 2025, 2026, 2027].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <span className="text-sm text-slate-500 font-medium">
          {MESES[mes - 1]} {anio}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {([
          { key: 'resumen', label: 'Posición IVA' },
          { key: 'ventas', label: `Libro IVA Ventas (${ventas.length})` },
          { key: 'compras', label: `Libro IVA Compras (${compras.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumen IVA ── */}
      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                  <TrendingUp size={20} />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase">Débito Fiscal (Ventas)</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{fmt(resumen.ivaDebitoFiscal)}</p>
              <p className="text-xs text-slate-400 mt-1">{resumen.cantFacturas} facturas · Total {fmt(resumen.totalVentas)}</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                  <TrendingDown size={20} />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase">Crédito Fiscal (Compras)</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{fmt(resumen.ivaCreditoFiscal)}</p>
              <p className="text-xs text-slate-400 mt-1">{resumen.cantCompras} compras · Total {fmt(resumen.totalCompras)}</p>
            </Card>

            <Card className={`p-5 border-2 ${resumen.debesPagar ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${resumen.debesPagar ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                  <DollarSign size={20} />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase">Posición IVA</span>
              </div>
              <p className={`text-3xl font-black ${resumen.debesPagar ? 'text-red-700' : 'text-green-700'}`}>
                {resumen.debesPagar ? '-' : '+'} {fmt(Math.abs(resumen.posicionIVA))}
              </p>
              <p className="text-xs mt-1 text-slate-500">
                {resumen.debesPagar ? 'A pagar' : 'Saldo a favor'}
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-slate-700 text-sm mb-1">Recomendación para tus contadoras</p>
                <p className="text-slate-600 text-sm">{resumen.recomendacion}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Libro IVA Ventas ── */}
      {tab === 'ventas' && (
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-xs">
              <tr>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">PV</th>
                <th className="px-3 py-3">N° Comp.</th>
                <th className="px-3 py-3">Receptor</th>
                <th className="px-3 py-3 text-right">Neto Grav.</th>
                <th className="px-3 py-3 text-right">IVA 21%</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">CAE</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5">{v.fecha}</td>
                  <td className="px-3 py-2.5 font-medium">{v.tipoComprobante}</td>
                  <td className="px-3 py-2.5">{v.puntoVenta}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{v.nroComprobante}</td>
                  <td className="px-3 py-2.5 text-slate-500">{v.docReceptor}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(v.netoGravado)}</td>
                  <td className="px-3 py-2.5 text-right text-blue-600 font-medium">{fmt(v.iva21)}</td>
                  <td className="px-3 py-2.5 text-right font-bold">{fmt(v.total)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{v.cae}</td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No hay facturas emitidas en este período.
                  </td>
                </tr>
              )}
            </tbody>
            {ventas.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-sm">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right">TOTALES:</td>
                  <td className="px-3 py-3 text-right">{fmt(ventas.reduce((s, v) => s + v.netoGravado, 0))}</td>
                  <td className="px-3 py-3 text-right text-blue-700">{fmt(ventas.reduce((s, v) => s + v.iva21, 0))}</td>
                  <td className="px-3 py-3 text-right">{fmt(ventas.reduce((s, v) => s + v.total, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Tab: Libro IVA Compras ── */}
      {tab === 'compras' && (
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-xs">
              <tr>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Proveedor</th>
                <th className="px-3 py-3">CUIT</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">N° Comp.</th>
                <th className="px-3 py-3 text-right">Neto Grav.</th>
                <th className="px-3 py-3 text-right">IVA 21%</th>
                <th className="px-3 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5">{c.fecha}</td>
                  <td className="px-3 py-2.5 font-medium">{c.proveedor}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{c.cuitProveedor}</td>
                  <td className="px-3 py-2.5">{c.tipoComprobante}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{c.nroComprobante}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(c.netoGravado)}</td>
                  <td className="px-3 py-2.5 text-right text-green-600 font-medium">{fmt(c.iva21)}</td>
                  <td className="px-3 py-2.5 text-right font-bold">{fmt(c.total)}</td>
                </tr>
              ))}
              {compras.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No hay compras registradas en este período.
                  </td>
                </tr>
              )}
            </tbody>
            {compras.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-sm">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right">TOTALES:</td>
                  <td className="px-3 py-3 text-right">{fmt(compras.reduce((s, c) => s + c.netoGravado, 0))}</td>
                  <td className="px-3 py-3 text-right text-green-700">{fmt(compras.reduce((s, c) => s + c.iva21, 0))}</td>
                  <td className="px-3 py-3 text-right">{fmt(compras.reduce((s, c) => s + c.total, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
