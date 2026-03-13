// src/app/admin/ventas/components/VentasTable.tsx
// ─────────────────────────────────────────────
// Tabla de ventas con filtros, facturación, anulación, reimpresión,
// creación manual de ventas y edición completa
// ─────────────────────────────────────────────
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, FileText, Filter, Printer, Share2, Plus, X, Pencil } from 'lucide-react'
import { anularVenta, actualizarVenta, crearVentaManual } from '../actions'
import { facturarVenta } from '@/app/pos/actions'
import FacturacionModal from '@/components/modals/FacturacionModal'
import TableControls, { type TableOption } from '@/components/ui/TableControls'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import type { VentaRow } from '@/lib/types'

type ProductoOption = {
  id: string
  nombre: string
  precioEfectivo: number
  precioDigital: number
  categoria: string
}

type SucursalOption = { id: string; nombre: string }
type UsuarioOption = { id: string; nombre: string; sucursalId: string }

type VentasTableProps = {
  ventas: VentaRow[]
  sucursalOptions: TableOption[]
  usuarioOptions: TableOption[]
  productos: ProductoOption[]
  sucursales: SucursalOption[]
  usuarios: UsuarioOption[]
}

type ItemNuevaVenta = {
  productoId: string
  nombre: string
  cantidad: number
  precioUnit: number
}

type SortKey =
  | 'fecha-desc'
  | 'fecha-asc'
  | 'monto-desc'
  | 'monto-asc'
  | 'factura-desc'
  | 'factura-asc'

const METODO_FILTERS: TableOption[] = [
  { label: 'Todos los métodos', value: 'ALL' },
  { label: 'Efectivo', value: 'EFECTIVO' },
  { label: 'Mercado Pago', value: 'MP' },
]

const FACTURA_FILTERS: TableOption[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Facturadas', value: 'FACTURADA' },
  { label: 'Sin factura', value: 'PENDIENTE' },
]

const SORT_OPTIONS: TableOption[] = [
  { label: 'Fecha (más reciente)', value: 'fecha-desc' },
  { label: 'Fecha (más antigua)', value: 'fecha-asc' },
  { label: 'Monto (mayor)', value: 'monto-desc' },
  { label: 'Monto (menor)', value: 'monto-asc' },
  { label: 'Factura (número mayor)', value: 'factura-desc' },
  { label: 'Factura (número menor)', value: 'factura-asc' },
]

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function toLocalDatetimeValue(isoString: string) {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function VentasTable({
  ventas, sucursalOptions, usuarioOptions,
  productos, sucursales, usuarios,
}: VentasTableProps) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [metodoFilter, setMetodoFilter] = useState('ALL')
  const [sucursalFilter, setSucursalFilter] = useState('ALL')
  const [usuarioFilter, setUsuarioFilter] = useState('ALL')
  const [facturaFilter, setFacturaFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('fecha-desc')

  const [ventaAFacturar, setVentaAFacturar] = useState<string | null>(null)
  const [cargandoFactura, setCargandoFactura] = useState(false)
  const [ventaAAnular, setVentaAAnular] = useState<string | null>(null)
  const [anulandoVenta, setAnulandoVenta] = useState(false)
  const [ventaEditando, setVentaEditando] = useState<string | null>(null)
  const { showToast } = useToast()

  // ── Modal nueva venta ──
  const [mostrarNuevaVenta, setMostrarNuevaVenta] = useState(false)
  const [nuevaVentaData, setNuevaVentaData] = useState({
    fecha: toLocalDatetimeValue(new Date().toISOString()),
    metodoPago: 'EFECTIVO',
    estadoPago: 'APROBADO',
    sucursalId: sucursales[0]?.id || '',
    usuarioId: usuarios[0]?.id || '',
  })
  const [itemsNuevaVenta, setItemsNuevaVenta] = useState<ItemNuevaVenta[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cantidadProducto, setCantidadProducto] = useState('1')
  const [creandoVenta, setCreandoVenta] = useState(false)

  // ── Filtrado y ordenamiento ──
  const filteredAndSortedVentas = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = ventas.filter((venta) => {
      const isFacturada = Boolean(venta.nroFactura)

      const matchesSearch =
        query.length === 0 ||
        String(venta.numeroVenta).includes(query) ||
        venta.usuarioNombre.toLowerCase().includes(query) ||
        venta.sucursalNombre.toLowerCase().includes(query) ||
        venta.metodoPago.toLowerCase().includes(query) ||
        (venta.nroFactura ? String(venta.nroFactura).includes(query) : false)

      const matchesMetodo = metodoFilter === 'ALL' || venta.metodoPago === metodoFilter
      const matchesSucursal = sucursalFilter === 'ALL' || venta.sucursalNombre === sucursalFilter
      const matchesUsuario = usuarioFilter === 'ALL' || venta.usuarioNombre === usuarioFilter
      const matchesFactura =
        facturaFilter === 'ALL' ||
        (facturaFilter === 'FACTURADA' && isFacturada) ||
        (facturaFilter === 'PENDIENTE' && !isFacturada)

      return matchesSearch && matchesMetodo && matchesSucursal && matchesUsuario && matchesFactura
    })

    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'fecha-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'monto-desc': return b.total - a.total
        case 'monto-asc': return a.total - b.total
        case 'factura-desc': return (b.nroFactura ?? 0) - (a.nroFactura ?? 0)
        case 'factura-asc': return (a.nroFactura ?? 0) - (b.nroFactura ?? 0)
        case 'fecha-desc':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [facturaFilter, metodoFilter, search, sortKey, sucursalFilter, usuarioFilter, ventas])

  // ── Handlers ──
  const handleConfirmDelete = async () => {
    if (!ventaAAnular) return
    setAnulandoVenta(true)
    try {
      await anularVenta(ventaAAnular)
      showToast('Venta anulada correctamente.', 'success')
      setVentaAAnular(null)
      router.refresh()
    } catch {
      showToast('No se pudo anular la venta.', 'error')
    } finally {
      setAnulandoVenta(false)
    }
  }

  const handleConfirmFactura = async (datos: { tipo: string; receptorId: string; razonSocial?: string }) => {
    if (!ventaAFacturar) return
    setCargandoFactura(true)
    const res = await facturarVenta(ventaAFacturar, {
      tipo: datos.tipo,
      receptorId: datos.receptorId,
      razonSocialReceptor: datos.razonSocial,
    })
    if (res.success) {
      showToast(`Factura generada: CAE ${res.cae}`, 'success')
      setVentaAFacturar(null)
      router.refresh()
    } else {
      showToast(`Error AFIP: ${res.error}`, 'error')
    }
    setCargandoFactura(false)
  }

  const handleReimprimir = (ventaId: string) => {
    window.open(`/factura/${ventaId}?print=1`, '_blank')
  }

  const [compartiendo, setCompartiendo] = useState<string | null>(null)
  const handleCompartir = async (venta: VentaRow) => {
    const fileName = `Factura_${venta.tipoFactura}_${venta.nroFactura}.pdf`
    setCompartiendo(venta.id)

    try {
      const { generatePdfFromUrl } = await import('@/lib/generatePdf')
      const url = `${window.location.origin}/factura/${venta.id}`
      const blob = await generatePdfFromUrl(url)
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
      setCompartiendo(null)
    }
  }

  // ── Agregar producto a nueva venta ──
  const agregarItem = () => {
    const prod = productos.find((p) => p.id === productoSeleccionado)
    if (!prod) return
    const cant = parseFloat(cantidadProducto) || 1
    const precio = nuevaVentaData.metodoPago === 'EFECTIVO' ? prod.precioEfectivo : prod.precioDigital

    const existente = itemsNuevaVenta.find((it) => it.productoId === prod.id)
    if (existente) {
      setItemsNuevaVenta((prev) =>
        prev.map((it) => it.productoId === prod.id ? { ...it, cantidad: it.cantidad + cant } : it)
      )
    } else {
      setItemsNuevaVenta((prev) => [...prev, {
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad: cant,
        precioUnit: precio,
      }])
    }
    setProductoSeleccionado('')
    setCantidadProducto('1')
  }

  const quitarItem = (productoId: string) => {
    setItemsNuevaVenta((prev) => prev.filter((it) => it.productoId !== productoId))
  }

  const totalNuevaVenta = itemsNuevaVenta.reduce((sum, it) => sum + it.cantidad * it.precioUnit, 0)

  const handleCrearVenta = async () => {
    if (!itemsNuevaVenta.length) {
      showToast('Agregá al menos un producto.', 'error')
      return
    }
    setCreandoVenta(true)
    try {
      await crearVentaManual({
        fecha: nuevaVentaData.fecha,
        metodoPago: nuevaVentaData.metodoPago,
        estadoPago: nuevaVentaData.estadoPago,
        sucursalId: nuevaVentaData.sucursalId,
        usuarioId: nuevaVentaData.usuarioId,
        items: itemsNuevaVenta.map((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnit: it.precioUnit,
        })),
      })
      showToast('Venta creada correctamente.', 'success')
      setMostrarNuevaVenta(false)
      setItemsNuevaVenta([])
      router.refresh()
    } catch (err: any) {
      showToast(err?.message || 'Error al crear la venta.', 'error')
    } finally {
      setCreandoVenta(false)
    }
  }

  // Usuarios filtrados por sucursal seleccionada en nueva venta
  const usuariosFiltrados = usuarios.filter((u) => u.sucursalId === nuevaVentaData.sucursalId)

  // ── Render ──
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <TableControls
              searchPlaceholder="Buscar por N° venta, usuario, sucursal, método o factura"
              searchValue={search}
              onSearchChange={setSearch}
              filterLabel="Método"
              filterValue={metodoFilter}
              filterOptions={METODO_FILTERS}
              onFilterChange={setMetodoFilter}
              extraFilters={[
                { label: 'Sucursal', value: sucursalFilter, options: sucursalOptions, onChange: setSucursalFilter },
                { label: 'Usuario', value: usuarioFilter, options: usuarioOptions, onChange: setUsuarioFilter },
                { label: 'Factura', value: facturaFilter, options: FACTURA_FILTERS, onChange: setFacturaFilter },
              ]}
              sortLabel="Orden"
              sortValue={sortKey}
              sortOptions={SORT_OPTIONS}
              onSortChange={(value) => setSortKey(value as SortKey)}
            />
          </div>
          <button
            onClick={() => setMostrarNuevaVenta(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <Plus size={18} /> Nueva Venta
          </button>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Venta</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVentas.map((venta) => (
                <tr key={venta.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(venta.fecha).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 font-semibold">#{venta.numeroVenta}</td>
                  <td className="px-4 py-3 text-slate-600">{venta.sucursalNombre}</td>
                  <td className="px-4 py-3 text-slate-600">{venta.usuarioNombre}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(venta.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${venta.metodoPago === 'MP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {venta.metodoPago}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      venta.estadoPago === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' :
                      venta.estadoPago === 'ANULADO' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {venta.estadoPago}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {venta.nroFactura ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-600">FC {venta.tipoFactura}-{venta.nroFactura}</span>
                        <span className="text-[10px] text-slate-400">CAE: {venta.cae}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!venta.nroFactura && (
                        <button
                          onClick={() => setVentaAFacturar(venta.id)}
                          className="flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
                          title="Generar Factura AFIP"
                        >
                          <FileText size={13} /> AFIP
                        </button>
                      )}

                      {venta.nroFactura && (
                        <button
                          onClick={() => handleReimprimir(venta.id)}
                          className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded hover:bg-slate-200 text-xs font-bold"
                          title="Reimprimir factura"
                        >
                          <Printer size={13} /> Reimprimir
                        </button>
                      )}

                      {venta.nroFactura && (
                        <button
                          onClick={() => handleCompartir(venta)}
                          disabled={compartiendo === venta.id}
                          className="flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded hover:bg-green-200 text-xs font-bold disabled:opacity-50"
                          title="Compartir factura como PDF"
                        >
                          <Share2 size={13} /> {compartiendo === venta.id ? 'Generando...' : 'PDF'}
                        </button>
                      )}

                      {/* Editar */}
                      <button
                        onClick={() => setVentaEditando(ventaEditando === venta.id ? null : venta.id)}
                        className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Pencil size={14} /> Editar
                      </button>

                      <button onClick={() => setVentaAAnular(venta.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Anular venta">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Panel de edición expandido */}
                    {ventaEditando === venta.id && (
                      <form
                        action={actualizarVenta}
                        onSubmit={() => setTimeout(() => { setVentaEditando(null); router.refresh() }, 300)}
                        className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left"
                      >
                        <input type="hidden" name="ventaId" value={venta.id} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Fecha</label>
                            <Input
                              type="datetime-local"
                              name="fecha"
                              defaultValue={toLocalDatetimeValue(venta.fecha)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Total</label>
                            <Input
                              type="number"
                              name="total"
                              step="0.01"
                              min="0"
                              defaultValue={venta.total.toFixed(2)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Método de pago</label>
                            <Select name="metodoPago" defaultValue={venta.metodoPago}>
                              <option value="EFECTIVO">EFECTIVO</option>
                              <option value="MP">MERCADO PAGO</option>
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Estado de pago</label>
                            <Select name="estadoPago" defaultValue={venta.estadoPago}>
                              <option value="PENDIENTE">PENDIENTE</option>
                              <option value="APROBADO">APROBADO</option>
                              <option value="ANULADO">ANULADO</option>
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Tipo de factura</label>
                            <Input name="tipoFactura" defaultValue={venta.tipoFactura ?? ''} placeholder="A / B / C" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button type="button" variant="secondary" size="sm" onClick={() => setVentaEditando(null)}>
                            Cancelar
                          </Button>
                          <Button type="submit" size="sm">Guardar cambios</Button>
                        </div>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAndSortedVentas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No hay ventas que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* MODAL: Nueva Venta Manual                     */}
      {/* ══════════════════════════════════════════════ */}
      {mostrarNuevaVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-800">Nueva Venta Manual</h2>
              <button onClick={() => { setMostrarNuevaVenta(false); setItemsNuevaVenta([]) }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Datos de la venta */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Fecha y hora</label>
                <Input
                  type="datetime-local"
                  value={nuevaVentaData.fecha}
                  onChange={(e) => setNuevaVentaData((d) => ({ ...d, fecha: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Método de pago</label>
                <Select
                  value={nuevaVentaData.metodoPago}
                  onChange={(e) => {
                    const metodo = e.target.value
                    setNuevaVentaData((d) => ({ ...d, metodoPago: metodo }))
                    // Actualizar precios de items según método
                    setItemsNuevaVenta((prev) =>
                      prev.map((it) => {
                        const prod = productos.find((p) => p.id === it.productoId)
                        if (!prod) return it
                        return { ...it, precioUnit: metodo === 'EFECTIVO' ? prod.precioEfectivo : prod.precioDigital }
                      })
                    )
                  }}
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="MP">MERCADO PAGO</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Sucursal</label>
                <Select
                  value={nuevaVentaData.sucursalId}
                  onChange={(e) => {
                    const sucId = e.target.value
                    setNuevaVentaData((d) => ({ ...d, sucursalId: sucId, usuarioId: '' }))
                  }}
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Usuario</label>
                <Select
                  value={nuevaVentaData.usuarioId}
                  onChange={(e) => setNuevaVentaData((d) => ({ ...d, usuarioId: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  {usuariosFiltrados.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Estado de pago</label>
                <Select
                  value={nuevaVentaData.estadoPago}
                  onChange={(e) => setNuevaVentaData((d) => ({ ...d, estadoPago: e.target.value }))}
                >
                  <option value="APROBADO">APROBADO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                </Select>
              </div>
            </div>

            {/* Agregar productos */}
            <div className="border-t border-slate-200 pt-4 mb-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Productos</h3>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <Select
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} - {formatCurrency(nuevaVentaData.metodoPago === 'EFECTIVO' ? p.precioEfectivo : p.precioDigital)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                  className="w-20"
                  placeholder="Cant."
                />
                <Button type="button" onClick={agregarItem} disabled={!productoSeleccionado}>
                  <Plus size={16} />
                </Button>
              </div>

              {/* Lista de items */}
              {itemsNuevaVenta.length > 0 ? (
                <div className="space-y-2">
                  {itemsNuevaVenta.map((item) => (
                    <div key={item.productoId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.nombre}</span>
                        <span className="ml-2 text-slate-500">x{item.cantidad}</span>
                        <span className="ml-2 text-slate-400">@ {formatCurrency(item.precioUnit)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatCurrency(item.cantidad * item.precioUnit)}</span>
                        <button onClick={() => quitarItem(item.productoId)} className="text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Total</span>
                    <span className="text-lg font-black text-emerald-700">{formatCurrency(totalNuevaVenta)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No hay productos agregados.</p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setMostrarNuevaVenta(false); setItemsNuevaVenta([]) }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCrearVenta}
                disabled={creandoVenta || !itemsNuevaVenta.length || !nuevaVentaData.usuarioId}
              >
                {creandoVenta ? 'Creando...' : 'Crear Venta'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <FacturacionModal
        isOpen={!!ventaAFacturar}
        onClose={() => setVentaAFacturar(null)}
        onConfirm={handleConfirmFactura}
        cargando={cargandoFactura}
      />

      <ConfirmDialog
        open={!!ventaAAnular}
        title="Anular venta"
        description="¿Seguro que querés anular esta venta? Esta acción no se puede deshacer."
        confirmLabel="Sí, anular"
        loading={anulandoVenta}
        onClose={() => setVentaAAnular(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
