'use client'
import { useState, useRef } from 'react'
import { ShoppingCart, Trash2, CreditCard, Banknote, CheckCircle2, Smartphone, Loader2 } from 'lucide-react'
// Eliminamos imports de QR viejo y traemos los nuevos
import { enviarCobroTerminal, consultarEstadoPagoIntent, cancelarOrdenMP } from '@/app/actions/mercadopago'
import { registrarVenta, facturarVenta } from '../actions'

export default function PosShell({ productos, sucursalId, usuarioId }: { productos: any[], sucursalId: string, usuarioId: string }) {
    const [carrito, setCarrito] = useState<any[]>([])
    // Solo dos métodos ahora: Efectivo o la Terminal
    const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TERMINAL'>('EFECTIVO')

    const [showFacturacion, setShowFacturacion] = useState(false);
    const [tipoReceptor, setTipoReceptor] = useState<'CF' | 'CUIL'>('CF');
    const [idReceptor, setIdReceptor] = useState('');
    const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B');

    // Estados para la Terminal
    const [esperandoPago, setEsperandoPago] = useState(false);
    const [mensajeTerminal, setMensajeTerminal] = useState('');

    // Refs para controlar el polling y poder cancelarlo
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [orderIdActual, setOrderIdActual] = useState<string | null>(null); // Nuevo estado

    // Hardcodeo temporal (según tu código original)
    sucursalId = '5fdbe000-6d63-4298-a919-eeaf7af75582';
    usuarioId = 'b5ffac6f-5390-4c64-abed-3424b7945cb8';

    const [ventaIdActual, setVentaIdActual] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const agregarAlCarrito = (producto: any) => {
        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id)
            if (existe) {
                return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
            }
            return [...prev, { ...producto, cantidad: 1 }]
        })
    }

    const total = carrito.reduce((acc, item) => {
        // Asumimos que TERMINAL usa el precioDigital
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

    // --- FUNCIÓN DE CANCELAR OPERACIÓN EN CURSO ---
    const cancelarOperacion = async () => {
        // 1. Frenamos el reloj
        if (pollingRef.current) clearInterval(pollingRef.current);

        // 2. Si hay una orden en MP, la cancelamos allá para liberar la terminal
        if (orderIdActual) {
            try {
                await cancelarOrdenMP(orderIdActual);
                console.log("Orden cancelada en Mercado Pago");
            } catch (error) {
                console.error("No se pudo cancelar en MP:", error);
            }
        }

        // 3. Limpiamos la pantalla
        setEsperandoPago(false);
        setOrderIdActual(null);
        setCargando(false);
    };

    // --- PASO 1: FINALIZAR VENTA Y COBRAR ---
    const handleFinalizarVenta = async () => {
        if (carrito.length === 0) return alert("Carrito vacío");
        setCargando(true);

        const res = await registrarVenta({
            items: carrito,
            total,
            metodoPago,
            sucursalId,
            usuarioId
        });

        if (res.success && res.ventaId) {
            setVentaIdActual(res.ventaId);

            if (metodoPago === 'TERMINAL') {
                setEsperandoPago(true);
                setMensajeTerminal("Enviando orden a la terminal...");

                // LLAMADA A LA NUEVA API DE ORDERS
                const cobroRes = await enviarCobroTerminal(sucursalId, total, res.ventaId);

                if (cobroRes.error) {
                    alert("Error: " + cobroRes.error);
                    setEsperandoPago(false);
                    setCargando(false);
                    return;
                }

                // GUARDAMOS EL ID DE LA ORDEN PARA PODER CANCELARLA LUEGO
                setOrderIdActual(cobroRes.orderId);
                setMensajeTerminal("¡Listo! Procese el pago en la terminal.");

                // POLLING (Seguimos preguntando a nuestra DB si el Webhook ya la aprobó)
                pollingRef.current = setInterval(async () => {
                    const pagado = await consultarEstadoPagoIntent(res.ventaId); // Esta función mira tu DB

                    if (pagado) {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setEsperandoPago(false);
                        setOrderIdActual(null);
                        alert("¡PAGO RECIBIDO! ✅");
                        setShowFacturacion(true);
                        setCargando(false);
                    }
                }, 3000);

            } else {
                // Flujo efectivo
                if (confirm("Venta registrada. ¿Facturar?")) setShowFacturacion(true);
                else resetPOS();
            }
        }
        setCargando(false);
    };

    // --- PASO 2: FACTURAR (AFIP) ---
    const handleProcesarFactura = async () => {
        if (!ventaIdActual) return;
        if (tipoReceptor === 'CUIL' && idReceptor.length < 11) return alert("CUIT inválido");

        setCargando(true);
        const res = await facturarVenta(ventaIdActual, {
            tipo: tipoFactura,
            receptorId: idReceptor || "0"
        });

        if (res.success) {
            alert(`Factura ${tipoFactura} generada: Nro ${res.nro}\nCAE: ${res.cae}`);
            resetPOS();
        } else {
            alert("Error AFIP: " + res.error);
            // No reseteamos para darle chance de intentar de nuevo o cambiar a Consumidor Final
        }
        setCargando(false);
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* IZQUIERDA: PRODUCTOS */}
            <div className="w-2/3 p-4 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {productos.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => agregarAlCarrito(p)}
                            className="h-32 bg-white rounded-2xl shadow-sm border-2 border-transparent active:border-orange-500 hover:shadow-md transition-all flex flex-col items-center justify-center p-2 text-center"
                        >
                            <span className="font-bold text-slate-800 uppercase text-sm">{p.nombre}</span>
                            <span className="text-orange-600 font-bold mt-1">
                                ${metodoPago === 'EFECTIVO' ? p.precioEfectivo.toString() : p.precioDigital.toString()}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* DERECHA: CARRITO Y PAGO */}
            <div className="w-1/3 bg-white border-l shadow-xl flex flex-col">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold flex items-center gap-2 text-slate-700"><ShoppingCart size={20} /> Carrito</h2>
                    <button onClick={() => setCarrito([])} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {carrito.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-sm uppercase">{item.nombre}</span>
                                <span className="text-xs font-bold text-slate-400">CANT: {item.cantidad}</span>
                            </div>
                            <span className="font-black text-slate-700">${((metodoPago === 'EFECTIVO' ? item.precioEfectivo : item.precioDigital) * item.cantidad).toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {/* SELECTOR DE PAGO (SOLO 2 OPCIONES) */}
                <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50">
                    <button
                        onClick={() => setMetodoPago('EFECTIVO')}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl font-black border-2 transition-all ${metodoPago === 'EFECTIVO' ? 'border-green-500 bg-white text-green-600 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Banknote size={24} className="mb-2" /> EFECTIVO
                    </button>

                    <button
                        onClick={() => setMetodoPago('TERMINAL')}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl font-black border-2 transition-all ${metodoPago === 'TERMINAL' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        <CreditCard size={24} className="mb-2" /> TERMINAL MP
                    </button>
                </div>

                <div className="p-6 bg-slate-900 text-white rounded-t-[2.5rem] shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total a Pagar</span>
                        <span className="text-4xl font-black text-orange-400 tracking-tight">${total.toFixed(2)}</span>
                    </div>
                    <button
                        disabled={cargando || carrito.length === 0}
                        onClick={handleFinalizarVenta}
                        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {cargando ? <Loader2 className="animate-spin" /> : "COBRAR"}
                    </button>
                </div>
            </div>

            {/* MODAL DE ESPERA TERMINAL POINT */}
            {esperandoPago && (
                <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full relative overflow-hidden">
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 animate-pulse"></div>

                        <div className="mb-6 flex justify-center">
                            <div className="bg-blue-100 p-6 rounded-full animate-bounce">
                                <Smartphone size={64} className="text-blue-600" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 mb-2">Mire la Terminal</h2>
                        <p className="text-blue-600 font-bold text-lg mb-4">{mensajeTerminal}</p>
                        <p className="text-slate-400 text-sm mb-8">El cliente puede usar Tarjeta o QR en el dispositivo.</p>

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

            {/* MODAL DE FACTURACIÓN AFIP (Se mantiene igual) */}
            {showFacturacion && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-4xl p-8 w-full max-w-md shadow-2xl border border-slate-100">
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
                                <button
                                    onClick={() => { setTipoReceptor('CF'); setTipoFactura('B'); }}
                                    className={`p-4 rounded-2xl border-2 font-black transition-all ${tipoReceptor === 'CF' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
                                >
                                    Cons. Final
                                </button>
                                <button
                                    onClick={() => setTipoReceptor('CUIL')}
                                    className={`p-4 rounded-2xl border-2 font-black transition-all ${tipoReceptor === 'CUIL' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
                                >
                                    CUIT / CUIL
                                </button>
                            </div>

                            {tipoReceptor === 'CUIL' && (
                                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Documento del Cliente</label>
                                        <input
                                            type="number"
                                            value={idReceptor}
                                            onChange={(e) => setIdReceptor(e.target.value)}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mt-1 text-xl font-mono focus:border-blue-500 outline-none transition-all"
                                            placeholder="20XXXXXXXX9"
                                        />
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
                            <button
                                disabled={cargando}
                                onClick={handleProcesarFactura}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95"
                            >
                                {cargando ? "COMUNICANDO CON AFIP..." : "GENERAR COMPROBANTE"}
                            </button>
                            <button
                                onClick={resetPOS}
                                className="w-full p-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Omitir por ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}