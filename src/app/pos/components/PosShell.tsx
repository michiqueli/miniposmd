'use client'
import { useState, useRef } from 'react'
import { Banknote, CheckCircle2, CreditCard, Loader2, Smartphone } from 'lucide-react'
import { enviarCobroTerminal, consultarEstadoPagoIntent } from '@/app/actions/mercadopago'
import { registrarVenta, facturarVenta } from '../actions'
import ProductGrid from '@/components/pos/ProductGrid'
import CartPanel from '@/components/pos/CartPanel'
import PosTopBar from '@/components/pos/PosTopBar'
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/toast';

type Producto = {
  id: string;
  nombre: string;
  precioEfectivo: number;
  precioDigital: number;
};

export default function PosShell({
  productos,
  sucursalId,
  usuarioNombre,
  usuarioRole,
}: {
  productos: Producto[],
  sucursalId: string,
  usuarioId: string,
  usuarioNombre: string,
  usuarioRole: 'ADMIN' | 'CASHIER',
}) {
  const [carrito, setCarrito] = useState<Array<Producto & { cantidad: number }>>([])
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TERMINAL'>('EFECTIVO')
  const [showFacturacion, setShowFacturacion] = useState(false);
  const [tipoReceptor, setTipoReceptor] = useState<'CF' | 'CUIL'>('CF');
  const [idReceptor, setIdReceptor] = useState('');
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B');
  const [esperandoPago, setEsperandoPago] = useState(false);
  const [mensajeTerminal, setMensajeTerminal] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [ventaIdActual, setVentaIdActual] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [showEfectivoConfirm, setShowEfectivoConfirm] = useState(false);
  const { showToast } = useToast();

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const sumarProducto = (itemId: string) => {
    setCarrito(prev => prev.map(item => item.id === itemId ? { ...item, cantidad: item.cantidad + 1 } : item))
  }

  const restarProducto = (itemId: string) => {
    setCarrito(prev => prev.flatMap(item => {
      if (item.id !== itemId) return [item]
      if (item.cantidad <= 1) return []
      return [{ ...item, cantidad: item.cantidad - 1 }]
    }))
  }

  const quitarProducto = (itemId: string) => {
    setCarrito(prev => prev.filter(item => item.id !== itemId))
  }

  const total = carrito.reduce((acc, item) => {
    const precio = metodoPago === 'EFECTIVO' ? Number(item.precioEfectivo) : Number(item.precioDigital)
    return acc + (precio * item.cantidad)
  }, 0)

  const resetPOS = () => {
    setCarrito([]);
    setShowFacturacion(false);
    setVentaIdActual(null);
    setIdReceptor('');
    setCargando(false);
    setEsperandoPago(false);
    if (pollingRef.current) clearInterval(pollingRef.current);
  }

  const cancelarOperacion = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setEsperandoPago(false);
    showToast('Operación cancelada en pantalla (la terminal puede tardar unos segundos en volver al inicio).');
  }

  const handleFinalizarVenta = async () => {
    if (carrito.length === 0) {
      showToast('Carrito vacío', 'error');
      return;
    }
    setCargando(true);

    const res = await registrarVenta({
      items: carrito,
      total,
      metodoPago
    });

    if (res.success && res.ventaId) {
      setVentaIdActual(res.ventaId);

      if (metodoPago === 'TERMINAL') {
        setEsperandoPago(true);
        setMensajeTerminal('Despertando terminal...');

        const cobroRes = await enviarCobroTerminal(sucursalId, total, res.ventaId);

        if (cobroRes.error) {
          showToast('Error comunicación: ' + cobroRes.error, 'error');
          setEsperandoPago(false);
          setCargando(false);
          return;
        }

        setMensajeTerminal('¡Terminal Lista! Pase Tarjeta o escanee QR en el dispositivo.');

        pollingRef.current = setInterval(async () => {
          const estado = await consultarEstadoPagoIntent(cobroRes.paymentIntentId);

          if (estado.finalizado) {
            if (pollingRef.current) clearInterval(pollingRef.current);

            if (estado.aprobado) {
              setEsperandoPago(false);
              showToast('¡Pago aprobado! ✅', 'success');
              setShowFacturacion(true);
            } else {
              setEsperandoPago(false);
              showToast('El pago fue rechazado o cancelado en la terminal.', 'error');
            }
          }
        }, 3000);
      } else {
        setShowEfectivoConfirm(true);
      }
    } else {
      showToast('Error al guardar venta: ' + res.error, 'error');
    }
    setCargando(false);
  };

  const handleProcesarFactura = async () => {
    if (!ventaIdActual) return;
    if (tipoReceptor === 'CUIL' && idReceptor.length < 11) {
      showToast('CUIT inválido', 'error');
      return;
    }

    setCargando(true);
    const res = await facturarVenta(ventaIdActual, {
      tipo: tipoFactura,
      receptorId: idReceptor || '0'
    });

    if (res.success) {
      showToast(`Factura ${tipoFactura} generada: Nro ${res.nro} - CAE: ${res.cae}`, 'success');
      resetPOS();
    } else {
      showToast('Error AFIP: ' + res.error, 'error');
    }
    setCargando(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <PosTopBar usuarioNombre={usuarioNombre} usuarioRole={usuarioRole} sucursalId={sucursalId} />

      <div className="w-2/3 pt-24 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto pb-6">
          <ProductGrid productos={productos} metodoPago={metodoPago} onAdd={agregarAlCarrito} />
        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-md p-4">
            <div className="mt-3 text-center mb-6">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total a pagar</span>
              <p className="text-4xl font-black text-slate-800">${total.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setMetodoPago('EFECTIVO')}
                className={`h-20 rounded-2xl font-black border-2 transition-all flex flex-col items-center justify-center text-xl ${metodoPago === 'EFECTIVO' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-slate-200 text-slate-500 bg-slate-50'}`}
              >
                <Banknote size={28} className="mb-2" />
                EFECTIVO
              </button>

              <button
                onClick={() => setMetodoPago('TERMINAL')}
                className={`h-20 rounded-2xl font-black border-2 transition-all flex flex-col items-center justify-center text-xl ${metodoPago === 'TERMINAL' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 bg-slate-50'}`}
              >
                <CreditCard size={28} className="mb-2" />
                TERMINAL MP
              </button>
            </div>
            <div>
              <button
                disabled={cargando || carrito.length === 0}
                onClick={handleFinalizarVenta}
                className="h-28 w-full rounded-2xl font-black bg-orange-500 hover:bg-orange-400 disabled:bg-slate-300 disabled:text-slate-500 text-white text-3xl shadow-lg transition-all active:scale-95"
              >
                {cargando ? 'COBRANDO...' : 'COBRAR'}
              </button>
            </div>

          </div>
        </div>
      </div>

      <CartPanel
        carrito={carrito}
        metodoPago={metodoPago}
        onClear={() => setCarrito([])}
        onIncreaseItem={sumarProducto}
        onDecreaseItem={restarProducto}
        onRemoveItem={quitarProducto}
      />

      {esperandoPago && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 animate-pulse"></div>
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                <Smartphone size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Mire la Terminal</h2>
            <p className="text-blue-600 font-bold text-lg mb-4">{mensajeTerminal}</p>
            <p className="text-slate-400 text-sm mb-8">El cliente puede usar Tarjeta o QR en el dispositivo.</p>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-mono bg-slate-100 p-2 rounded mb-6">
              <Loader2 size={12} className="animate-spin" /> Esperando confirmación...
            </div>
            <button onClick={cancelarOperacion} className="w-full py-3 text-red-500 font-bold border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
              Cancelar Operación
            </button>
          </div>
        </div>
      )}

      {showFacturacion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-none">AFIP</h2>
                <p className="text-slate-400 text-sm font-bold">Emitir Comprobante</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setTipoReceptor('CF'); setTipoFactura('B'); }} className={`p-4 rounded-2xl border-2 font-black transition-all ${tipoReceptor === 'CF' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>
                  Cons. Final
                </button>
                <button onClick={() => setTipoReceptor('CUIL')} className={`p-4 rounded-2xl border-2 font-black transition-all ${tipoReceptor === 'CUIL' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>
                  CUIT / CUIL
                </button>
              </div>

              {tipoReceptor === 'CUIL' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Documento del Cliente</label>
                    <input type="number" value={idReceptor} onChange={(e) => setIdReceptor(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mt-1 text-xl font-mono focus:border-blue-500 outline-none transition-all" placeholder="20XXXXXXXX9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Factura</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button onClick={() => setTipoFactura('A')} className={`p-3 rounded-xl border-2 font-black transition-all ${tipoFactura === 'A' ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-100 text-slate-400'}`}>FACTURA A</button>
                      <button onClick={() => setTipoFactura('B')} className={`p-3 rounded-xl border-2 font-black transition-all ${tipoFactura === 'B' ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-100 text-slate-400'}`}>FACTURA B</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-2">
              <button disabled={cargando} onClick={handleProcesarFactura} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95">
                {cargando ? 'COMUNICANDO CON AFIP...' : 'GENERAR COMPROBANTE'}
              </button>
              <button onClick={resetPOS} className="w-full p-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">
                Omitir por ahora
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showEfectivoConfirm}
        title="Venta en efectivo registrada"
        description="¿Querés generar factura ahora?"
        confirmLabel="Sí, facturar"
        cancelLabel="No, omitir"
        onClose={() => {
          setShowEfectivoConfirm(false);
          resetPOS();
        }}
        onConfirm={() => {
          setShowEfectivoConfirm(false);
          setShowFacturacion(true);
        }}
      />
    </div>
  )
}
