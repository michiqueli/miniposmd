'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/toast';
import { crearCompra, actualizarCompra, CATEGORIAS_COMPRA, type CompraListItem } from '../actions';
import { consultarCUIT } from '@/app/pos/actions';
import { Loader2 } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editando: CompraListItem | null;
  onSuccess: () => void;
};

const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as const;
const TIPOS_COMPROBANTE = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
  { value: 'X', label: 'Sin comprobante' },
] as const;

export default function CompraFormModal({ isOpen, onClose, editando, onSuccess }: Props) {
  const { showToast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [buscandoCUIT, setBuscandoCUIT] = useState(false);

  // Form state
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_COMPRA[0]);
  const [metodoPago, setMetodoPago] = useState<string>(METODOS_PAGO[0]);
  const [cuitProveedor, setCuitProveedor] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('X');
  const [nroComprobante, setNroComprobante] = useState('');
  const [netoGravado, setNetoGravado] = useState('');
  const [ivaDiscriminado, setIvaDiscriminado] = useState('');

  // Init form when editing
  useEffect(() => {
    if (editando) {
      setFecha(editando.fecha.slice(0, 10));
      setDescripcion(editando.descripcion);
      setMonto(String(editando.monto));
      setCategoria(editando.categoria);
      setMetodoPago(editando.metodoPago || 'EFECTIVO');
      setCuitProveedor(editando.cuitProveedor || '');
      setNombreProveedor(editando.nombreProveedor || '');
      setTipoComprobante(editando.tipoComprobante || 'X');
      setNroComprobante(editando.nroComprobante || '');
      setNetoGravado(editando.netoGravado != null ? String(editando.netoGravado) : '');
      setIvaDiscriminado(editando.ivaDiscriminado != null ? String(editando.ivaDiscriminado) : '');
    } else {
      setFecha(new Date().toISOString().slice(0, 10));
      setDescripcion('');
      setMonto('');
      setCategoria(CATEGORIAS_COMPRA[0]);
      setMetodoPago(METODOS_PAGO[0]);
      setCuitProveedor('');
      setNombreProveedor('');
      setTipoComprobante('X');
      setNroComprobante('');
      setNetoGravado('');
      setIvaDiscriminado('');
    }
  }, [editando, isOpen]);

  // Auto-buscar CUIT
  useEffect(() => {
    const limpio = cuitProveedor.replace(/\D/g, '');
    if (limpio.length !== 11) return;

    const timer = setTimeout(async () => {
      setBuscandoCUIT(true);
      const res = await consultarCUIT(limpio);
      if (res.success && res.razonSocial) {
        setNombreProveedor(res.razonSocial);
      }
      setBuscandoCUIT(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [cuitProveedor]);

  const handleSubmit = async () => {
    if (!descripcion || !monto || !fecha) {
      showToast('Completá fecha, descripción y monto', 'error');
      return;
    }

    setCargando(true);

    if (editando) {
      const res = await actualizarCompra(editando.id, {
        fecha,
        descripcion,
        monto: Number(monto),
        categoria,
        metodoPago,
        cuitProveedor: cuitProveedor || undefined,
        nombreProveedor: nombreProveedor || undefined,
        tipoComprobante,
        nroComprobante: nroComprobante || undefined,
        netoGravado: netoGravado ? Number(netoGravado) : null,
        ivaDiscriminado: ivaDiscriminado ? Number(ivaDiscriminado) : null,
      });
      if (res.success) {
        showToast('Compra actualizada', 'success');
        onSuccess();
      } else {
        showToast(res.error || 'Error', 'error');
      }
    } else {
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
      });
      if (res.success) {
        showToast('Compra registrada', 'success');
        onSuccess();
      } else {
        showToast(res.error || 'Error', 'error');
      }
    }

    setCargando(false);
  };

  const inputClass = 'w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 outline-none transition-all';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase ml-1';

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-black text-slate-800">
          {editando ? 'Editar Compra' : 'Nueva Compra'}
        </DialogTitle>
        <DialogDescription className="text-slate-400 text-sm mb-4">
          {editando ? 'Modificá los datos de la compra' : 'Cargá los datos de la compra'}
        </DialogDescription>

        <div className="space-y-4">
          {/* Fecha + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
                {CATEGORIAS_COMPRA.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className={labelClass}>Descripción</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} placeholder="Qué se compró..." />
          </div>

          {/* Proveedor */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase">Datos del Proveedor</p>
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
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>
          </div>

          {/* Comprobante */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo Comprobante</label>
              <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className={inputClass}>
                {TIPOS_COMPROBANTE.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nro Comprobante</label>
              <input value={nroComprobante} onChange={(e) => setNroComprobante(e.target.value)} className={inputClass} placeholder="0001-00001234" />
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
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            disabled={cargando}
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black text-base shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center"
          >
            {cargando ? 'Guardando...' : editando ? 'ACTUALIZAR COMPRA' : 'GUARDAR COMPRA'}
          </button>
          <button onClick={onClose} className="w-full p-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
