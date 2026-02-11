'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { ShoppingCart, Trash2, CreditCard, Banknote, CheckCircle2, Loader2, LogOut, Smartphone } from 'lucide-react'
// Eliminamos imports de QR viejo y traemos los nuevos
import { enviarCobroTerminal, consultarEstadoPagoIntent } from '@/app/actions/mercadopago'
import { registrarVenta, facturarVenta } from '../actions'
import { logoutAction } from '@/app/actions/auth'

export default function PosShell({
    productos,
    sucursalId,
    usuarioId,
    usuarioNombre,
    usuarioRole,
}: {
    productos: any[],
    sucursalId: string,
    usuarioId: string,
    usuarioNombre: string,
    usuarioRole: 'ADMIN' | 'CASHIER',
}) {
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
    const cancelarOperacion = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setEsperandoPago(false);
        // Aquí podrías llamar a una action para cancelar la orden en MP si quisieras ser muy prolijo
        alert("Operación cancelada en pantalla (la terminal puede tardar unos segundos en volver al inicio).");
    }

    // --- PASO 1: FINALIZAR VENTA Y COBRAR ---
    const handleFinalizarVenta = async () => {
        if (carrito.length === 0) return alert("Carrito vacío");
        setCargando(true);

        // 1. Registramos la venta en DB
        const res = await registrarVenta({
            items: carrito,
            total,
            metodoPago
        });

        if (res.success && res.ventaId) {
            setVentaIdActual(res.ventaId);

            if (metodoPago === 'TERMINAL') {
                // --- FLUJO TERMINAL POINT ---
                setEsperandoPago(true);
                setMensajeTerminal("Despertando terminal...");

                // Convertimos a Number si tu server action espera number, o lo dejamos string si cambiaste la action.
                // Como es un UUID, asumo que ajustaste la action para recibir string.
                // Si la action espera number, esto fallará (avísame).
                const cobroRes = await enviarCobroTerminal(sucursalId as any, total, res.ventaId);

                if (cobroRes.error) {
                    alert("Error Comunicación: " + cobroRes.error);
                    setEsperandoPago(false);
                    setCargando(false);
                    return;
                }

                setMensajeTerminal("¡Terminal Lista! Pase Tarjeta o escanee QR en el dispositivo.");

                // Iniciamos el Polling
                pollingRef.current = setInterval(async () => {
                    const estado = await consultarEstadoPagoIntent(cobroRes.paymentIntentId);
                    
                    if (estado.finalizado) {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        
                        if (estado.aprobado) {
                            // PAGO EXITOSO
                            setEsperandoPago(false);
                            alert("¡PAGO APROBADO! ✅");
                            setShowFacturacion(true); // Pasamos a facturar
                        } else {
                            // PAGO RECHAZADO
                            setEsperandoPago(false);
                            alert("❌ El pago fue rechazado o cancelado en la terminal.");
                            // Aquí podrías decidir si borrar la venta o dejarla pendiente
                        }
                    }
                }, 3000); // Preguntar cada 3 segundos

            } else {
                // --- FLUJO EFECTIVO ---
                const quiereFactura = confirm("Venta Efectivo registrada. ¿Facturar?");
                if (quiereFactura) setShowFacturacion(true);
                else resetPOS();
            }
        } else {
            alert("Error al guardar venta: " + res.error);
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
            <div className="fixed top-4 left-4 right-4 z-40 flex justify-between items-center bg-white/95 border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                <div>
                    <p className="font-bold text-slate-700">{usuarioNombre}</p>
                    <p className="text-xs text-slate-500">{usuarioRole} · Sucursal {sucursalId.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-2">
                    {usuarioRole === 'ADMIN' && (
                        <Link href="/admin/ventas" className="text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">
                            Ir a Admin
                        </Link>
                    )}
                    <form action={logoutAction}>
                        <button className="text-sm px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 font-semibold text-red-700 flex items-center gap-1">
                            <LogOut size={14} /> Salir
                        </button>
                    </form>
                </div>
            </div>
            {/* IZQUIERDA: PRODUCTOS */}
            <div className="w-2/3 p-4 overflow-y-auto pt-24">
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
            <div className="w-1/3 bg-white border-l shadow-xl flex flex-col pt-20">
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
                        <Banknote size={24} className="mb-2"/> EFECTIVO
                    </button>
                    
                    <button
                        onClick={() => setMetodoPago('TERMINAL')}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl font-black border-2 transition-all ${metodoPago === 'TERMINAL' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        <CreditCard size={24} className="mb-2"/> TERMINAL MP
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
                            <Loader2 size={12} className="animate-spin"/> Esperando confirmación...
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
