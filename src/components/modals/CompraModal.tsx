'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Loader2, X, ShoppingBag } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/toast';
import { crearCompra, CATEGORIAS_COMPRA } from '@/app/admin/compras/actions';
import { procesarImagenFactura } from '@/app/admin/compras/actions';
import { consultarCUIT } from '@/app/pos/actions';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as const;
const TIPOS_COMPROBANTE = [
  { value: 'A', label: 'FC A' },
  { value: 'B', label: 'FC B' },
  { value: 'C', label: 'FC C' },
  { value: 'X', label: 'Sin comp.' },
] as const;

export default function CompraModal({ isOpen, onClose }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps: 'foto' -> 'form'
  const [step, setStep] = useState<'foto' | 'form'>('foto');
  const [procesando, setProcessando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [buscandoCUIT, setBuscandoCUIT] = useState(false);

  // Image data
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenBase64, setImagenBase64] = useState<string | null>(null);
  const [imagenMimeType, setImagenMimeType] = useState<string>('');
  const [imagenFileName, setImagenFileName] = useState<string>('');

  // Form fields
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_COMPRA[0]);
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [cuitProveedor, setCuitProveedor] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('X');
  const [nroComprobante, setNroComprobante] = useState('');
  const [netoGravado, setNetoGravado] = useState('');
  const [ivaDiscriminado, setIvaDiscriminado] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('foto');
      setImagenPreview(null);
      setImagenBase64(null);
      setFecha(new Date().toISOString().slice(0, 10));
      setDescripcion('');
      setMonto('');
      setCategoria(CATEGORIAS_COMPRA[0]);
      setMetodoPago('EFECTIVO');
      setCuitProveedor('');
      setNombreProveedor('');
      setTipoComprobante('X');
      setNroComprobante('');
      setNetoGravado('');
      setIvaDiscriminado('');
    }
  }, [isOpen]);

  // Auto-buscar CUIT
  useEffect(() => {
    const limpio = cuitProveedor.replace(/\D/g, '');
    if (limpio.length !== 11 || step !== 'form') return;

    const timer = setTimeout(async () => {
      setBuscandoCUIT(true);
      const res = await consultarCUIT(limpio);
      if (res.success && res.razonSocial) {
        setNombreProveedor(res.razonSocial);
      }
      setBuscandoCUIT(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [cuitProveedor, step]);

  const handleFileSelect = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagenPreview(dataUrl);

      const base64 = dataUrl.split(',')[1];
      setImagenBase64(base64);
      setImagenMimeType(file.type);
      setImagenFileName(file.name);

      // Procesar con Gemini
      setProcessando(true);
      const res = await procesarImagenFactura(base64, file.type);

      if (res.success && res.datos) {
        const d = res.datos;
        if (d.fecha) setFecha(d.fecha);
        if (d.descripcion) setDescripcion(d.descripcion);
        if (d.montoTotal != null) setMonto(String(d.montoTotal));
        if (d.cuitProveedor) setCuitProveedor(d.cuitProveedor);
        if (d.nombreProveedor) setNombreProveedor(d.nombreProveedor);
        if (d.tipoComprobante) setTipoComprobante(d.tipoComprobante);
        if (d.nroComprobante) setNroComprobante(d.nroComprobante);
        if (d.netoGravado != null) setNetoGravado(String(d.netoGravado));
        if (d.ivaDiscriminado != null) setIvaDiscriminado(String(d.ivaDiscriminado));
        showToast('Datos extraídos de la imagen', 'success');
      } else {
        showToast('No se pudieron extraer datos. Completá manualmente.', 'error');
      }

      setProcessando(false);
      setStep('form');
    };
    reader.readAsDataURL(file);
  };

  const handleSkipPhoto = () => {
    setStep('form');
  };

  const handleGuardar = async () => {
    if (!descripcion || !monto || !fecha) {
      showToast('Completá fecha, descripción y monto', 'error');
      return;
    }

    setGuardando(true);
    const res = await crearCompra({
      fecha,
      descripcion,
      monto: Number(monto),
      categoria,
      metodoPago,
      cuitProveedor: cuitProveedor || undefined,
      nombreProveedor: nombreProveedor || undefined,
      tipoComprobante,
      nroComprobante: nroComprobante || undefined,
      netoGravado: netoGravado ? Number(netoGravado) : undefined,
      ivaDiscriminado: ivaDiscriminado ? Number(ivaDiscriminado) : undefined,
      fotoBase64: imagenBase64 || undefined,
      fotoMimeType: imagenMimeType || undefined,
      fotoFileName: imagenFileName || undefined,
    });

    if (res.success) {
      showToast('Compra registrada', 'success');
      onClose();
    } else {
      showToast(res.error || 'Error al guardar', 'error');
    }
    setGuardando(false);
  };

  const inputClass = 'w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-mono focus:border-blue-500 outline-none transition-all';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase ml-1';

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-500 p-2 rounded-xl text-white">
            <ShoppingBag size={22} />
          </div>
          <div>
            <DialogTitle className="text-xl font-black text-slate-800 leading-none">Cargar Compra</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm font-bold">
              {step === 'foto' ? 'Sacá una foto o seleccioná la imagen' : 'Revisá y completá los datos'}
            </DialogDescription>
          </div>
        </div>

        {/* ═══ STEP 1: Foto ═══ */}
        {step === 'foto' && !procesando && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Camera size={32} />
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                Sacá una foto del ticket/factura para extraer los datos automáticamente
              </p>

              <div className="flex flex-col gap-3">
                {/* Camera (mobile) */}
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file);
                    };
                    input.click();
                  }}
                  className="w-full py-4 rounded-2xl font-black bg-orange-500 hover:bg-orange-400 text-white text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Camera size={22} />
                  Sacar Foto
                </button>

                {/* File picker */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  Seleccionar Imagen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSkipPhoto}
              className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
            >
              Cargar sin foto
            </button>
          </div>
        )}

        {/* ═══ Processing ═══ */}
        {procesando && (
          <div className="py-12 text-center">
            <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-700">Analizando imagen...</p>
            <p className="text-sm text-slate-400 mt-1">Extrayendo datos con IA</p>
          </div>
        )}

        {/* ═══ STEP 2: Form ═══ */}
        {step === 'form' && !procesando && (
          <div className="space-y-4">
            {/* Image preview (small) */}
            {imagenPreview && (
              <div className="relative">
                <img src={imagenPreview} alt="Ticket" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                <button
                  onClick={() => {
                    setImagenPreview(null);
                    setImagenBase64(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Fecha */}
            <div>
              <label className={labelClass}>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </div>

            {/* Proveedor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>CUIT Proveedor</label>
                <input
                  type="number"
                  value={cuitProveedor}
                  onChange={(e) => setCuitProveedor(e.target.value)}
                  className={inputClass}
                  placeholder="20XXXXXXXX9"
                />
                {buscandoCUIT && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                    <Loader2 size={12} className="animate-spin" /> Buscando...
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Razón Social</label>
                <input
                  value={nombreProveedor}
                  onChange={(e) => setNombreProveedor(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre proveedor"
                />
              </div>
            </div>

            {/* Comprobante */}
            <div>
              <label className={labelClass}>Tipo Comprobante</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {TIPOS_COMPROBANTE.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipoComprobante(t.value)}
                    className={`p-2 rounded-xl border-2 text-xs font-black transition-all ${
                      tipoComprobante === t.value
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nro Comprobante */}
            <div>
              <label className={labelClass}>Nro Comprobante</label>
              <input value={nroComprobante} onChange={(e) => setNroComprobante(e.target.value)} className={inputClass} placeholder="0001-00001234" />
            </div>

            {/* Descripción */}
            <div>
              <label className={labelClass}>Descripción</label>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} placeholder="Qué se compró..." />
            </div>

            {/* Categoría */}
            <div>
              <label className={labelClass}>Categoría</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {CATEGORIAS_COMPRA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    className={`p-2 rounded-xl border-2 text-xs font-black transition-all ${
                      categoria === c
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Montos */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Monto Total</label>
                <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              {tipoComprobante === 'A' && (
                <>
                  <div>
                    <label className={labelClass}>Neto Gravado</label>
                    <input type="number" step="0.01" value={netoGravado} onChange={(e) => setNetoGravado(e.target.value)} className={inputClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={labelClass}>IVA</label>
                    <input type="number" step="0.01" value={ivaDiscriminado} onChange={(e) => setIvaDiscriminado(e.target.value)} className={inputClass} placeholder="0.00" />
                  </div>
                </>
              )}
            </div>

            {/* Método de pago */}
            <div>
              <label className={labelClass}>Método de Pago</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    className={`p-2 rounded-xl border-2 text-xs font-black transition-all ${
                      metodoPago === m
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                disabled={guardando}
                onClick={handleGuardar}
                className="w-full py-4 rounded-2xl font-black bg-orange-500 hover:bg-orange-400 disabled:bg-orange-300 text-white text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center"
              >
                {guardando ? 'Guardando...' : 'GUARDAR COMPRA'}
              </button>
              <button onClick={onClose} className="w-full py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
