// src/app/pos/components/PosShell.tsx
// ─────────────────────────────────────────────
// Componente principal del POS
// CAMBIOS:
//   - Usa consultarEstadoOrden (fix del bug de polling)
//   - Usa FacturacionModal reutilizable (antes estaba inline)
//   - Tipos importados desde lib/types
// ─────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import { CreditCard, Banknote, Smartphone, Loader2, Share2, Check, PencilLine } from 'lucide-react'
import {
  enviarCobroTerminal,
  consultarEstadoOrden,     // ← FIX: antes era consultarEstadoPagoIntent
  cancelarOrdenMP,
} from '@/app/actions/mercadopago'
import { registrarVenta, facturarVenta } from '../actions'
import ProductGrid from '@/components/pos/ProductGrid'
import CartPanel from '@/components/pos/CartPanel'
import PosTopBar from '@/components/pos/PosTopBar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FacturacionModal from '@/components/modals/FacturacionModal'
import CompraModal from '@/components/modals/CompraModal'
import { useToast } from '@/components/ui/toast'
import type { ProductoPOS, ItemCarrito } from '@/lib/types'

export default function PosShell({
  productos,
  sucursalId,
  sucursalNombre,
  usuarioNombre,
  usuarioRole,
}: {
  productos: ProductoPOS[];
  sucursalId: string;
  sucursalNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRole: 'ADMIN' | 'CASHIER';
}) {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TERMINAL'>('EFECTIVO')
  const [esperandoPago, setEsperandoPago] = useState(false)
  const [mensajeTerminal, setMensajeTerminal] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [ventaIdActual, setVentaIdActual] = useState<string | null>(null)
  const [orderIdActual, setOrderIdActual] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [showEfectivoConfirm, setShowEfectivoConfirm] = useState(false)
  const [showFacturacion, setShowFacturacion] = useState(false)
  const [cargandoFactura, setCargandoFactura] = useState(false)
  const [showCompartirPdf, setShowCompartirPdf] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [facturaInfo, setFacturaInfo] = useState<{ ventaId: string; tipo: string; nro: number } | null>(null)
  const [showCompraModal, setShowCompraModal] = useState(false)
  const [showManualItem, setShowManualItem] = useState(false)
  const [manualNombre, setManualNombre] = useState('')
  const [manualPrecio, setManualPrecio] = useState('')
  const { showToast } = useToast()

  // ── Item manual ──

  const agregarItemManual = () => {
    const precio = parseFloat(manualPrecio)
    if (!manualNombre.trim() || isNaN(precio) || precio <= 0) {
      showToast('Ingresá nombre y precio válido', 'error')
      return
    }
    const manualId = `manual-${Date.now()}`
    setCarrito(prev => [
      ...prev,
      {
        id: manualId,
        nombre: manualNombre.trim(),
        precioEfectivo: precio,
        precioDigital: precio,
        categoria: 'MANUAL',
        cantidad: 1,
        esManual: true,
      },
    ])
    setManualNombre('')
    setManualPrecio('')
    setShowManualItem(false)
  }

  // ── Carrito ──

  const agregarAlCarrito = (producto: ProductoPOS) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        return prev.map(item =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const sumarProducto = (itemId: string) => {
    setCarrito(prev =>
      prev.map(item => (item.id === itemId ? { ...item, cantidad: item.cantidad + 1 } : item))
    )
  }

  const restarProducto = (itemId: string) => {
    setCarrito(prev =>
      prev.flatMap(item => {
        if (item.id !== itemId) return [item]
        if (item.cantidad <= 1) return []
        return [{ ...item, cantidad: item.cantidad - 1 }]
      })
    )
  }

  const quitarProducto = (itemId: string) => {
    setCarrito(prev => prev.filter(item => item.id !== itemId))
  }

  const total = carrito.reduce((acc, item) => {
    const precio = metodoPago === 'EFECTIVO' ? Number(item.precioEfectivo) : Number(item.precioDigital)
    return acc + precio * item.cantidad
  }, 0)

  // ── Reset ──

  const resetPOS = () => {
    setCarrito([])
    setShowFacturacion(false)
    setShowCompartirPdf(false)
    setCompartiendo(false)
    setFacturaInfo(null)
    setVentaIdActual(null)
    setOrderIdActual(null)
    setCargando(false)
    setCargandoFactura(false)
    setEsperandoPago(false)
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  // ── Cancelar operación MP ──

  const cancelarOperacion = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (orderIdActual) await cancelarOrdenMP(orderIdActual)
    setEsperandoPago(false)
    showToast('Operación cancelada (la terminal puede tardar unos segundos).')
  }

  // ── Finalizar venta ──

  const handleFinalizarVenta = async () => {
    if (carrito.length === 0) {
      showToast('Carrito vacío', 'error')
      return
    }
    setCargando(true)

    const res = await registrarVenta({
      items: carrito,
      total,
      metodoPago,
    })

    if (res.success && res.ventaId) {
      setVentaIdActual(res.ventaId)

      if (metodoPago === 'TERMINAL') {
        setEsperandoPago(true)
        setMensajeTerminal('Despertando terminal...')

        const cobroRes = await enviarCobroTerminal(sucursalId, total, res.ventaId)

        if (cobroRes.error) {
          showToast('Error comunicación: ' + cobroRes.error, 'error')
          setEsperandoPago(false)
          setCargando(false)
          return
        }

        setOrderIdActual(cobroRes.orderId || null)
        setMensajeTerminal('¡Terminal Lista! Pase Tarjeta o escanee QR en el dispositivo.')

        // ── POLLING CORREGIDO: consulta /v1/orders/{orderId} ──
        pollingRef.current = setInterval(async () => {
          const estado = await consultarEstadoOrden(cobroRes.orderId!)

          if (estado.finalizado) {
            if (pollingRef.current) clearInterval(pollingRef.current)

            if (estado.aprobado) {
              setEsperandoPago(false)
              showToast('¡Pago aprobado! ✅', 'success')
              setShowFacturacion(true)
            } else {
              setEsperandoPago(false)
              showToast('Pago rechazado o cancelado en la terminal.', 'error')
            }
          }
        }, 4000) // cada 4 segundos
      } else {
        // Efectivo
        setShowEfectivoConfirm(true)
      }
    } else {
      showToast('Error al guardar venta: ' + res.error, 'error')
    }
    setCargando(false)
  }

  // ── Facturar (usando el modal reutilizable) ──

  const handleProcesarFactura = async (datos: {
    tipo: 'A' | 'B';
    receptorId: string;
    razonSocial?: string;
  }) => {
    if (!ventaIdActual) return

    setCargandoFactura(true)
    const res = await facturarVenta(ventaIdActual, {
      tipo: datos.tipo,
      receptorId: datos.receptorId,
      razonSocialReceptor: datos.razonSocial,
    })

    if (res.success) {
      showToast(`Factura generada: Nro ${res.nro} - CAE: ${res.cae}`, 'success')
      setShowFacturacion(false)
      setFacturaInfo({ ventaId: ventaIdActual, tipo: datos.tipo, nro: res.nro! })
      setShowCompartirPdf(true)
    } else {
      showToast('Error AFIP: ' + res.error, 'error')
    }
    setCargandoFactura(false)
  }

  // ── Render ──

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <PosTopBar
        usuarioNombre={usuarioNombre}
        usuarioRole={usuarioRole}
        sucursalNombre={sucursalNombre}
        onCargarCompra={() => setShowCompraModal(true)}
      />

      {/* ── Grilla de productos + panel de cobro ── */}
      <div className="w-2/3 pt-[4.5rem] flex flex-col">
        <div className="flex-1 p-3 overflow-y-auto pb-2">
          <ProductGrid
            productos={productos}
            metodoPago={metodoPago}
            onAdd={agregarAlCarrito}
          />
        </div>

        <div className="p-3 bg-slate-100 border-t border-slate-200">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-3">
            <div className="text-center mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Total a pagar
              </span>
              <p className="text-2xl font-black text-slate-800">${total.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setMetodoPago('EFECTIVO')}
                className={`h-12 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 text-sm ${
                  metodoPago === 'EFECTIVO'
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                    : 'border-slate-200 text-slate-500 bg-slate-50'
                }`}
              >
                <Banknote size={20} />
                EFECTIVO
              </button>

              <button
                onClick={() => setMetodoPago('TERMINAL')}
                className={`h-12 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 text-sm ${
                  metodoPago === 'TERMINAL'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 text-slate-500 bg-slate-50'
                }`}
              >
                <CreditCard size={20} />
                TERMINAL MP
              </button>
            </div>

            <button
              disabled={cargando || carrito.length === 0}
              onClick={handleFinalizarVenta}
              className="h-14 w-full rounded-xl font-black bg-orange-500 hover:bg-orange-400 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xl shadow-lg transition-all active:scale-95"
            >
              {cargando ? 'COBRANDO...' : 'COBRAR'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Carrito lateral ── */}
      <CartPanel
        carrito={carrito}
        metodoPago={metodoPago}
        onClear={() => setCarrito([])}
        onIncreaseItem={sumarProducto}
        onDecreaseItem={restarProducto}
        onRemoveItem={quitarProducto}
        onAddManual={() => setShowManualItem(true)}
      />

      {/* ── Modal: Item Manual ── */}
      {showManualItem && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <PencilLine size={20} className="text-orange-500" />
              Item Manual
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                <input
                  type="text"
                  value={manualNombre}
                  onChange={e => setManualNombre(e.target.value)}
                  placeholder="Ej: Bebida, Café..."
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Precio</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={manualPrecio}
                  onChange={e => setManualPrecio(e.target.value)}
                  placeholder="0.00"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && agregarItemManual()}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowManualItem(false); setManualNombre(''); setManualPrecio('') }}
                className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={agregarItemManual}
                className="flex-1 py-2.5 rounded-xl font-bold bg-orange-500 hover:bg-orange-400 text-white text-sm shadow active:scale-95 transition-all"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay: Esperando pago en terminal ── */}
      {esperandoPago && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 animate-pulse" />
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                <Smartphone size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Mire la Terminal</h2>
            <p className="text-blue-600 font-bold text-lg mb-4">{mensajeTerminal}</p>
            <p className="text-slate-400 text-sm mb-8">
              El cliente puede usar Tarjeta o QR en el dispositivo.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-mono bg-slate-100 p-2 rounded mb-6">
              <Loader2 size={12} className="animate-spin" /> Esperando confirmación...
            </div>
            <button
              onClick={cancelarOperacion}
              className="w-full py-3 text-red-500 font-bold border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
            >
              Cancelar Operación
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Facturación AFIP (reutilizable) ── */}
      <FacturacionModal
        isOpen={showFacturacion}
        onClose={() => {
          setShowFacturacion(false)
          resetPOS()
        }}
        onConfirm={handleProcesarFactura}
        cargando={cargandoFactura}
      />

      {/* ── Confirm dialog: venta en efectivo ── */}
      <ConfirmDialog
        open={showEfectivoConfirm}
        title="Venta en efectivo registrada"
        description="¿Querés generar factura ahora?"
        confirmLabel="Sí, facturar"
        cancelLabel="No, omitir"
        onClose={() => {
          setShowEfectivoConfirm(false)
          resetPOS()
        }}
        onConfirm={() => {
          setShowEfectivoConfirm(false)
          setShowFacturacion(true)
        }}
      />

      {/* ── Overlay: Compartir PDF de factura ── */}
      {showCompartirPdf && facturaInfo && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Check size={36} />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-1">Factura generada</h2>
            <p className="text-slate-500 text-sm mb-6">
              FC {facturaInfo.tipo} N° {facturaInfo.nro}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setCompartiendo(true)
                  try {
                    const { generatePdfFromUrl } = await import('@/lib/generatePdf')
                    const url = `${window.location.origin}/factura/${facturaInfo.ventaId}`
                    const blob = await generatePdfFromUrl(url)
                    const fileName = `Factura_${facturaInfo.tipo}_${facturaInfo.nro}.pdf`
                    const file = new File([blob], fileName, { type: 'application/pdf' })

                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ title: fileName, files: [file] })
                    } else {
                      const downloadUrl = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = downloadUrl
                      a.download = fileName
                      a.click()
                      URL.revokeObjectURL(downloadUrl)
                      showToast('PDF descargado.', 'success')
                    }
                  } catch (err: any) {
                    if (err?.name !== 'AbortError') {
                      showToast('Error al generar el PDF.', 'error')
                    }
                  } finally {
                    setCompartiendo(false)
                  }
                }}
                disabled={compartiendo}
                className="w-full py-4 rounded-2xl font-black bg-green-500 hover:bg-green-400 disabled:bg-green-300 text-white text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Share2 size={22} />
                {compartiendo ? 'Generando PDF...' : 'Compartir PDF'}
              </button>

              <button
                onClick={resetPOS}
                className="w-full py-3 text-slate-500 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cargar Compra ── */}
      <CompraModal
        isOpen={showCompraModal}
        onClose={() => setShowCompraModal(false)}
      />
    </div>
  )
}
