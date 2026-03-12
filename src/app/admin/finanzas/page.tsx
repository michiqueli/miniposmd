// src/app/admin/finanzas/page.tsx
// ─────────────────────────────────────────────
// Página de Finanzas: Centro de administración financiera
// ─────────────────────────────────────────────

import { getFinanzasData } from './actions'
import FinanzasDashboard from './components/FinanzasDashboard'
import type { TipoPeriodo } from '@/lib/types'

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mes?: string; anio?: string }>
}) {
  const params = await searchParams
  const hoy = new Date()
  const periodo = (params.periodo as TipoPeriodo) || 'mes'
  const mes = params.mes ? parseInt(params.mes, 10) : hoy.getMonth() + 1
  const anio = params.anio ? parseInt(params.anio, 10) : hoy.getFullYear()

  const data = await getFinanzasData(periodo, mes, anio)

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Finanzas</h1>
      <FinanzasDashboard
        data={data}
        periodo={periodo}
        mes={mes}
        anio={anio}
      />
    </div>
  )
}
