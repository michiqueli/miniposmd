'use client'
import { useState } from 'react'
import { ShoppingCart, Trash2, CreditCard, Banknote, CheckCircle2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react';
import { crearPreferenciaMP, chequearEstadoPago } from '../mp-action';
import { registrarVenta, facturarVenta } from '../actions'

export default function PosShell({ productos, sucursalId, usuarioId }: { productos: any[], sucursalId: string, usuarioId: string }) {
    const [carrito, setCarrito] = useState<any[]>([])
    const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'MP'>('EFECTIVO')
    const [showFacturacion, setShowFacturacion] = useState(false);
    const [tipoReceptor, setTipoReceptor] = useState<'CF' | 'CUIL'>('CF');
    const [idReceptor, setIdReceptor] = useState('');
    const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B');
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [esperandoPago, setEsperandoPago] = useState(false);

    sucursalId = '5fdbe000-6d63-4298-a919-eeaf7af75582'; // Sucursal por defecto si no se pasa
    usuarioId = 'b5ffac6f-5390-4c64-abed-3424b7945cb8'; // Usuario por defecto si no se pasa

    // Estado para saber qué venta estamos facturando
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
        const precio = metodoPago === 'EFECTIVO' ? Number(item.precioEfectivo) : Number(item.precioDigital)
        return acc + (precio * item.cantidad)
    }, 0)

    const resetPOS = () => {
        setCarrito([]);
        setShowFacturacion(false);
        setVentaIdActual(null);
        setIdReceptor('');
        setCargando(false);
    }

    // PASO 1: Registrar la venta y el stock
    const handleFinalizarVenta = async () => {
        if (carrito.length === 0) return alert("Carrito vacío");
        setCargando(true);

        // 1. Registramos la venta (PENDIENTE)
        const res = await registrarVenta({
            items: carrito,
            total,
            metodoPago,
            sucursalId,
            usuarioId
        });

        if (res.success && res.ventaId) {
            setVentaIdActual(res.ventaId);

            if (metodoPago === 'MP') {
                // FLUJO DIGITAL: Generar QR
                const mpRes = await crearPreferenciaMP(res.ventaId);
                if (mpRes.success && mpRes.init_point) {
                    setQrUrl(mpRes.init_point);
                    setEsperandoPago(true);

                    // Iniciamos el "polling" para ver si paga
                    const intervalo = setInterval(async () => {
                        const pagado = await chequearEstadoPago(res.ventaId!);
                        if (pagado) {
                            clearInterval(intervalo);
                            setEsperandoPago(false);
                            setQrUrl(null);
                            alert("¡PAGO APROBADO! 💰");
                            // Ahora sí, abrimos el modal de AFIP automáticamente
                            setShowFacturacion(true);
                        }
                    }, 2000); // Chequeamos cada 3 segundos
                }
            } else {
                // FLUJO EFECTIVO (Sigue igual)
                const quiereFactura = confirm("Venta Efectivo registrada. ¿Facturar?");
                if (quiereFactura) setShowFacturacion(true);
                else resetPOS();
            }
        }
        setCargando(false);
    };

    // PASO 2: Facturar la venta que ya existe en la DB
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
            alert("Error AFIP: " + res.error + ". Podrá reintentar luego desde el panel de ventas.");
            resetPOS(); // Cerramos igual porque la venta ya se guardó en el Paso 1
        }
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

            {/* DERECHA: CARRITO */}
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

                {/* SELECTOR DE PAGO */}
                <div className="p-4 grid grid-cols-2 gap-2 bg-slate-50">
                    <button
                        onClick={() => setMetodoPago('EFECTIVO')}
                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-black border-2 transition-all ${metodoPago === 'EFECTIVO' ? 'border-green-500 bg-white text-green-600 shadow-sm' : 'border-transparent text-slate-400'}`}
                    >
                        <Banknote size={20} /> EFECTIVO
                    </button>
                    <button
                        onClick={() => setMetodoPago('MP')}
                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-black border-2 transition-all ${metodoPago === 'MP' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-transparent text-slate-400'}`}
                    >
                        <CreditCard size={20} /> DIGITAL
                    </button>
                </div>

                <div className="p-6 bg-slate-900 text-white rounded-t-[2.5rem] shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Pollería</span>
                        <span className="text-4xl font-black text-orange-400 tracking-tight">${total.toFixed(2)}</span>
                    </div>
                    <button
                        disabled={cargando || carrito.length === 0}
                        onClick={handleFinalizarVenta}
                        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {cargando ? "PROCESANDO..." : "FINALIZAR VENTA"}
                    </button>
                </div>
            </div>

            {/* MODAL DE PAGO QR MP */}
            {esperandoPago && qrUrl && (
                <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
                        <h2 className="text-2xl font-black text-blue-600 mb-2">Escaneá para Pagar</h2>
                        <p className="text-slate-500 mb-6 font-bold text-lg">${total.toFixed(2)}</p>

                        <div className="flex justify-center mb-6 p-4 bg-white border-2 border-slate-100 rounded-xl">
                            <QRCodeSVG value={qrUrl} size={200} />
                        </div>

                        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm animate-pulse">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Esperando confirmación de pago...
                        </div>

                        <button
                            onClick={() => { setEsperandoPago(false); setQrUrl(null); }}
                            className="mt-8 text-red-400 font-bold hover:text-red-600"
                        >
                            Cancelar operación
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL DE FACTURACIÓN AFIP */}
            {showFacturacion && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-4xl p-8 w-full max-w-md shadow-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-600 p-2 rounded-xl text-white">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 leading-none">AFIP</h2>
                                <p className="text-slate-400 text-sm font-bold">Emitir Comprobante Legal</p>
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
                                            <button
                                                onClick={() => setTipoFactura('A')}
                                                className={`p-3 rounded-xl border-2 font-black transition-all ${tipoFactura === 'A' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'border-slate-100 text-slate-400'}`}
                                            >
                                                FACTURA A
                                            </button>
                                            <button
                                                onClick={() => setTipoFactura('B')}
                                                className={`p-3 rounded-xl border-2 font-black transition-all ${tipoFactura === 'B' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'border-slate-100 text-slate-400'}`}
                                            >
                                                FACTURA B
                                            </button>
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