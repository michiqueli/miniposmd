// src/app/admin/finanzas/actions.ts
// ─────────────────────────────────────────────
// Server Actions para el módulo de Finanzas
// Combina datos de MP API + DB local para análisis financiero completo
// ─────────────────────────────────────────────
'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { mpFetch } from '@/lib/mercadopago'
import type { ResumenFinanzas, DesgloseMPTipo, TipoPeriodo } from '@/lib/types'

// ══════════════════════════════════════════════
// HELPERS DE PERÍODO
// ══════════════════════════════════════════════

function calcularRango(
  tipo: TipoPeriodo,
  mes: number,
  anio: number,
): { desde: Date; hasta: Date; label: string } {
  const hoy = new Date()

  switch (tipo) {
    case 'semana': {
      const dia = hoy.getDay()
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1))
      lunes.setHours(0, 0, 0, 0)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      domingo.setHours(23, 59, 59, 999)
      const lunesFmt = lunes.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      const domingoFmt = domingo.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      return { desde: lunes, hasta: domingo, label: `Semana ${lunesFmt} - ${domingoFmt}` }
    }
    case 'anio': {
      return {
        desde: new Date(anio, 0, 1),
        hasta: new Date(anio, 11, 31, 23, 59, 59, 999),
        label: `Año ${anio}`,
      }
    }
    case 'mes':
    default: {
      const MESES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ]
      return {
        desde: new Date(anio, mes - 1, 1),
        hasta: new Date(anio, mes, 0, 23, 59, 59, 999),
        label: `${MESES[mes - 1]} ${anio}`,
      }
    }
  }
}

// ══════════════════════════════════════════════
// MERCADO PAGO: Fetch pagos con paginación
// ══════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MPPaymentRaw = Record<string, any>

type MPPayment = {
  id: number
  transaction_amount: number
  operation_type: string
  payment_type_id: string
  payment_method_id: string
  status: string
  date_approved: string | null
  collector_id: number | null
  payer_id: number | null
  net_received: number
  charges_details: {
    name: string
    type: string
    amounts: { original: number; refunded: number }
    rate: number
  }[]
  point_of_interaction?: {
    type: string
  }
  card?: {
    tags?: string[]
  }
}

/**
 * Normaliza un pago de la API de MP.
 * La API tiene distintos formatos según la antigüedad y tipo de pago:
 * - Pagos nuevos: amounts.collector.net_received
 * - Pagos viejos: transaction_details.net_received_amount
 * - charges_details puede no tener rate ni amounts en pagos viejos
 */
function normalizarPago(raw: MPPaymentRaw): MPPayment {
  const bruto = raw.transaction_amount ?? 0

  // net_received: probar amounts.collector primero, luego transaction_details
  const netFromAmounts = raw.amounts?.collector?.net_received
  const netFromDetails = raw.transaction_details?.net_received_amount
  const netReceived = typeof netFromAmounts === 'number'
    ? netFromAmounts
    : typeof netFromDetails === 'number'
      ? netFromDetails
      : bruto // si no hay dato, asumir bruto

  // Normalizar charges_details
  const chargesRaw = Array.isArray(raw.charges_details) ? raw.charges_details : []
  const charges = chargesRaw.map((c: MPPaymentRaw) => ({
    name: c.name ?? '',
    type: c.type ?? '',
    amounts: {
      original: c.amounts?.original ?? 0,
      refunded: c.amounts?.refunded ?? 0,
    },
    rate: typeof c.rate === 'number' ? c.rate : 0,
  }))

  return {
    id: raw.id,
    transaction_amount: bruto,
    operation_type: raw.operation_type ?? '',
    payment_type_id: raw.payment_type_id ?? '',
    payment_method_id: raw.payment_method_id ?? '',
    status: raw.status ?? '',
    date_approved: raw.date_approved ?? null,
    collector_id: raw.collector_id ?? null,
    payer_id: raw.payer_id ?? null,
    net_received: netReceived,
    charges_details: charges,
    point_of_interaction: raw.point_of_interaction,
    card: raw.card,
  }
}

const COLLECTOR_ID = 80710247

async function fetchAllMPPayments(desde: Date, hasta: Date): Promise<MPPayment[]> {
  const all: MPPayment[] = []
  let offset = 0
  const limit = 100

  const beginDate = desde.toISOString()
  const endDate = hasta.toISOString()

  while (true) {
    const params = new URLSearchParams({
      'sort': 'date_approved',
      'criteria': 'asc',
      'begin_date': beginDate,
      'end_date': endDate,
      'status': 'approved',
      'limit': String(limit),
      'offset': String(offset),
    })

    const res = await mpFetch(`/v1/payments/search?${params}`)
    if (!res.ok) {
      console.error('MP API error:', res.status, await res.text())
      break
    }

    const data = await res.json()
    const results = (data.results as MPPaymentRaw[]).map(normalizarPago)

    // Filtrar solo pagos donde somos el collector (no pagos que nosotros hacemos)
    const cobros = results.filter((p) => p.collector_id === COLLECTOR_ID)
    all.push(...cobros)

    if ((offset + results.length) >= data.paging.total || results.length < limit) {
      break
    }
    offset += limit
  }

  return all
}

// ══════════════════════════════════════════════
// CLASIFICAR TIPO DE COBRO MP
// ══════════════════════════════════════════════

function clasificarPago(p: MPPayment): { tipo: string; label: string } {
  const isPOS = p.operation_type === 'pos_payment'
  const isQR = p.operation_type === 'regular_payment'

  if (isPOS) {
    // Tarjeta física en POS
    if (p.payment_type_id === 'credit_card') {
      return { tipo: 'pos_credito', label: 'POS Crédito' }
    }
    if (p.payment_type_id === 'debit_card') {
      const tags = p.card?.tags || []
      if (tags.includes('prepaid')) {
        return { tipo: 'pos_prepago', label: 'POS Prepago' }
      }
      return { tipo: 'pos_debito', label: 'POS Débito' }
    }
    return { tipo: 'pos_otro', label: 'POS Otro' }
  }

  if (isQR || p.point_of_interaction?.type === 'QR') {
    if (p.payment_type_id === 'account_money') {
      return { tipo: 'qr_account_money', label: 'QR Saldo MP' }
    }
    if (p.payment_type_id === 'bank_transfer') {
      return { tipo: 'qr_transfer', label: 'QR Transferencia' }
    }
    if (p.payment_type_id === 'debit_card') {
      return { tipo: 'qr_debito', label: 'QR Débito' }
    }
    if (p.payment_type_id === 'credit_card') {
      return { tipo: 'qr_credito', label: 'QR Crédito' }
    }
    return { tipo: 'qr_otro', label: 'QR Otro' }
  }

  // Fallback
  return { tipo: `otro_${p.payment_type_id}`, label: `Otro (${p.payment_type_id})` }
}

// ══════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════

export async function getFinanzasData(
  periodo: TipoPeriodo,
  mes: number,
  anio: number,
): Promise<ResumenFinanzas> {
  await requireRole(['ADMIN'])

  const { desde, hasta, label } = calcularRango(periodo, mes, anio)

  // ── Fetch en paralelo: MP API + DB local ──
  const [mpPayments, ventasEfectivoRaw, comprasRaw] = await Promise.all([
    fetchAllMPPayments(desde, hasta),
    db.venta.findMany({
      where: {
        fecha: { gte: desde, lte: hasta },
        metodoPago: 'EFECTIVO',
        estadoPago: { not: 'ANULADO' },
        deletedAt: null,
      },
    }),
    db.compra.findMany({
      where: {
        fecha: { gte: desde, lte: hasta },
        deletedAt: null,
      },
    }),
  ])

  // Tipar para evitar implicit any en reduces
  const ventasEfectivo = ventasEfectivoRaw as { total: unknown }[]
  const compras = comprasRaw as { monto: unknown; metodoPago: string; categoria: string | null }[]

  // ── Ingresos efectivo ──
  const ingresosEfectivo = ventasEfectivo.reduce((s, v) => s + Number(v.total), 0)

  // ── Análisis MP ──
  const agrupado = new Map<string, {
    label: string
    cantOps: number
    bruto: number
    comisionMP: number
    sirtac: number
    neto: number
    tasas: number[]
    tasasSirtac: number[]
  }>()

  let totalComisionMP = 0
  let totalSirtac = 0

  for (const p of mpPayments) {
    const { tipo, label: tipoLabel } = clasificarPago(p)

    let grupo = agrupado.get(tipo)
    if (!grupo) {
      grupo = { label: tipoLabel, cantOps: 0, bruto: 0, comisionMP: 0, sirtac: 0, neto: 0, tasas: [], tasasSirtac: [] }
      agrupado.set(tipo, grupo)
    }

    grupo.cantOps++
    grupo.bruto += p.transaction_amount
    grupo.neto += p.net_received

    for (const charge of p.charges_details) {
      const monto = charge.amounts.original
      // rate puede ser 0 en pagos viejos; calcular desde monto/bruto
      const rate = charge.rate > 0
        ? charge.rate
        : (p.transaction_amount > 0 ? +((monto / p.transaction_amount) * 100).toFixed(2) : 0)

      if (charge.type === 'fee') {
        grupo.comisionMP += monto
        totalComisionMP += monto
        if (rate > 0) grupo.tasas.push(rate)
      } else if (charge.type === 'tax') {
        grupo.sirtac += monto
        totalSirtac += monto
        if (rate > 0) grupo.tasasSirtac.push(rate)
      }
    }
  }

  // Convertir a array
  const ordenTipos = [
    'qr_account_money', 'qr_transfer', 'qr_debito', 'qr_credito',
    'pos_debito', 'pos_prepago', 'pos_credito', 'pos_otro',
    'qr_otro',
  ]

  const desgloseMPTipos: DesgloseMPTipo[] = Array.from(agrupado.entries())
    .sort((a, b) => {
      const ia = ordenTipos.indexOf(a[0])
      const ib = ordenTipos.indexOf(b[0])
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(([tipo, g]) => {
      const tasaPromedio = g.tasas.length > 0
        ? +(g.tasas.reduce((s, t) => s + t, 0) / g.tasas.length).toFixed(2)
        : 0
      const tasaSirtacPromedio = g.tasasSirtac.length > 0
        ? +(g.tasasSirtac.reduce((s, t) => s + t, 0) / g.tasasSirtac.length).toFixed(2)
        : 0
      return {
        tipo,
        label: g.label,
        cantOps: g.cantOps,
        bruto: +g.bruto.toFixed(2),
        comisionMP: +g.comisionMP.toFixed(2),
        tasaMP: tasaPromedio,
        sirtac: +g.sirtac.toFixed(2),
        tasaSirtac: tasaSirtacPromedio,
        neto: +g.neto.toFixed(2),
      }
    })

  const ingresosMPBruto = +mpPayments.reduce((s: number, p: MPPayment) => s + p.transaction_amount, 0).toFixed(2)
  const ingresosMPNeto = +mpPayments.reduce((s: number, p: MPPayment) => s + p.net_received, 0).toFixed(2)
  const totalDescuentosMP = +(totalComisionMP + totalSirtac).toFixed(2)
  const totalIngresos = +(ingresosEfectivo + ingresosMPBruto).toFixed(2)

  // ── Gastos ──
  const gastosEfectivo = compras
    .filter((c) => c.metodoPago === 'EFECTIVO')
    .reduce((s, c) => s + Number(c.monto), 0)
  const gastosTransferencia = compras
    .filter((c) => c.metodoPago === 'TRANSFERENCIA')
    .reduce((s, c) => s + Number(c.monto), 0)
  const gastosTarjeta = compras
    .filter((c) => c.metodoPago === 'TARJETA')
    .reduce((s, c) => s + Number(c.monto), 0)
  const totalGastos = compras.reduce((s, c) => s + Number(c.monto), 0)

  // Gastos por categoría
  const catMap = new Map<string, number>()
  for (const c of compras) {
    const cat = c.categoria || 'Sin categoría'
    catMap.set(cat, (catMap.get(cat) || 0) + Number(c.monto))
  }
  const gastosPorCategoria = Array.from(catMap.entries())
    .map(([categoria, monto]) => ({ categoria, monto: +monto.toFixed(2) }))
    .sort((a, b) => b.monto - a.monto)

  // ── Saldos ──
  const saldoCajaEfectivo = +(ingresosEfectivo - gastosEfectivo).toFixed(2)
  const saldoEstimadoMP = +(ingresosMPNeto - gastosTransferencia).toFixed(2)

  // ── Ganancia real ──
  const gananciaReal = +(ingresosEfectivo + ingresosMPNeto - totalGastos).toFixed(2)
  const totalIngresosReales = ingresosEfectivo + ingresosMPNeto
  const margenPorcentaje = totalIngresosReales > 0
    ? +((gananciaReal / totalIngresosReales) * 100).toFixed(1)
    : 0

  // ── Tendencia: comparar con período anterior ──
  let tendencia: ResumenFinanzas['tendencia'] = null
  try {
    const duracion = hasta.getTime() - desde.getTime()
    const desdeAnterior = new Date(desde.getTime() - duracion)
    const hastaAnterior = new Date(desde.getTime() - 1)

    const [mpAnterior, ventasEfAnteriorRaw, comprasAnteriorRaw] = await Promise.all([
      fetchAllMPPayments(desdeAnterior, hastaAnterior),
      db.venta.findMany({
        where: {
          fecha: { gte: desdeAnterior, lte: hastaAnterior },
          metodoPago: 'EFECTIVO',
          estadoPago: { not: 'ANULADO' },
          deletedAt: null,
        },
      }),
      db.compra.findMany({
        where: {
          fecha: { gte: desdeAnterior, lte: hastaAnterior },
          deletedAt: null,
        },
      }),
    ])

    const ventasEfAnterior = ventasEfAnteriorRaw as { total: unknown }[]
    const comprasAnterior = comprasAnteriorRaw as { monto: unknown }[]

    const efAnterior = ventasEfAnterior.reduce((s: number, v) => s + Number(v.total), 0)
    const mpBrutoAnterior = mpAnterior.reduce((s: number, p: MPPayment) => s + p.transaction_amount, 0)
    const mpNetoAnterior = mpAnterior.reduce((s: number, p: MPPayment) => s + p.net_received, 0)
    const gastosAnterior = comprasAnterior.reduce((s: number, c) => s + Number(c.monto), 0)

    const ingresosAnterior = +(efAnterior + mpBrutoAnterior).toFixed(2)
    const gananciaAnterior = +(efAnterior + mpNetoAnterior - gastosAnterior).toFixed(2)

    const variacionIngresos = ingresosAnterior > 0
      ? +(((totalIngresos - ingresosAnterior) / ingresosAnterior) * 100).toFixed(1)
      : 0
    const variacionGanancia = gananciaAnterior > 0
      ? +(((gananciaReal - gananciaAnterior) / gananciaAnterior) * 100).toFixed(1)
      : 0

    tendencia = { ingresosAnterior, gananciaAnterior, variacionIngresos, variacionGanancia }
  } catch {
    // Si falla tendencia, no rompe nada
  }

  // ── Alertas ──
  const alertas: string[] = []

  // Alerta si crédito tiene mucho peso
  const creditoTotal = desgloseMPTipos
    .filter((d) => d.tipo.includes('credito'))
    .reduce((s, d) => s + d.bruto, 0)
  if (ingresosMPBruto > 0 && creditoTotal / ingresosMPBruto > 0.15) {
    const pct = ((creditoTotal / ingresosMPBruto) * 100).toFixed(1)
    alertas.push(`${pct}% de tus cobros MP son con tarjeta de crédito (comisión ~7.61%). Intentá incentivar pagos por QR o débito para reducir comisiones.`)
  }

  // Alerta comisiones altas
  if (ingresosMPBruto > 0) {
    const pctComisiones = ((totalDescuentosMP / ingresosMPBruto) * 100).toFixed(1)
    if (Number(pctComisiones) > 5) {
      alertas.push(`Las comisiones + impuestos representan ${pctComisiones}% de tus ingresos MP. Considerá reducir pagos con tarjeta de crédito.`)
    }
  }

  // Alerta gastos altos vs ingresos
  if (totalIngresosReales > 0 && totalGastos / totalIngresosReales > 0.7) {
    alertas.push(`Los gastos representan más del 70% de tus ingresos reales. Revisá los gastos por categoría.`)
  }

  return {
    periodoLabel: label,
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    totalIngresos,
    ingresosEfectivo: +ingresosEfectivo.toFixed(2),
    ingresosMPBruto,
    ingresosMPNeto,
    totalComisionMP: +totalComisionMP.toFixed(2),
    totalSirtac: +totalSirtac.toFixed(2),
    totalDescuentosMP,
    porcentajeComisionesTotal: ingresosMPBruto > 0
      ? +((totalDescuentosMP / ingresosMPBruto) * 100).toFixed(2)
      : 0,
    desgloseMPTipos,
    cantOpsMP: mpPayments.length,
    totalGastos: +totalGastos.toFixed(2),
    gastosEfectivo: +gastosEfectivo.toFixed(2),
    gastosTransferencia: +gastosTransferencia.toFixed(2),
    gastosTarjeta: +gastosTarjeta.toFixed(2),
    gastosPorCategoria,
    saldoCajaEfectivo,
    saldoEstimadoMP,
    gananciaReal,
    margenPorcentaje,
    tendencia,
    alertas,
  }
}
