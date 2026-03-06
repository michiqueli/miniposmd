'use client'
import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/toast';
import { consultarCUIT } from '@/app/pos/actions';

interface FacturacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (datos: { tipo: 'A' | 'B', receptorId: string, tipoReceptor: 'CF' | 'CUIL', razonSocial?: string }) => Promise<void>;
  cargando: boolean;
}

export default function FacturacionModal({ isOpen, onClose, onConfirm, cargando }: FacturacionModalProps) {
  const [tipoReceptor, setTipoReceptor] = useState<'CF' | 'CUIL'>('CF');
  const [idReceptor, setIdReceptor] = useState('');
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B');
  const [razonSocial, setRazonSocial] = useState<string | null>(null);
  const [buscandoCUIT, setBuscandoCUIT] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // Auto-buscar razón social cuando el CUIT tiene 11 dígitos
  useEffect(() => {
    const cuitLimpio = idReceptor.replace(/\D/g, '');
    if (cuitLimpio.length !== 11) {
      setRazonSocial(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBuscandoCUIT(true);
      const res = await consultarCUIT(cuitLimpio);
      if (res.success) {
        setRazonSocial(res.razonSocial!);
      } else {
        setRazonSocial(null);
        showToast(res.error || 'CUIT no encontrado', 'error');
      }
      setBuscandoCUIT(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [idReceptor]);

  const handleConfirm = () => {
    const cuitLimpio = idReceptor.replace(/\D/g, '');
    if (tipoReceptor === 'CUIL' && cuitLimpio.length < 11) {
      showToast('El CUIT debe tener 11 dígitos', 'error');
      return;
    }
    if (tipoReceptor === 'CUIL' && !razonSocial) {
      showToast('Esperá a que se valide el CUIT en AFIP', 'error');
      return;
    }
    onConfirm({
      tipo: tipoFactura,
      receptorId: cuitLimpio || '0',
      tipoReceptor,
      razonSocial: razonSocial || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <DialogTitle className="text-2xl font-black text-slate-800 leading-none">AFIP</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm font-bold">Emitir Comprobante Legal</DialogDescription>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setTipoReceptor('CF');
                setTipoFactura('B');
              }}
              className={`p-4 rounded-2xl border-2 font-black transition-all ${
                tipoReceptor === 'CF' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'
              }`}
            >
              Cons. Final
            </button>
            <button
              onClick={() => setTipoReceptor('CUIL')}
              className={`p-4 rounded-2xl border-2 font-black transition-all ${
                tipoReceptor === 'CUIL' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'
              }`}
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
                {/* Resultado de búsqueda AFIP */}
                {buscandoCUIT && (
                  <div className="flex items-center gap-2 mt-2 px-2 text-sm text-blue-500">
                    <Loader2 size={14} className="animate-spin" />
                    Buscando en AFIP...
                  </div>
                )}
                {razonSocial && !buscandoCUIT && (
                  <div className="mt-2 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Razón Social</span>
                    <p className="text-base font-bold text-emerald-800">{razonSocial}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Factura</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setTipoFactura('A')}
                    className={`p-3 rounded-xl border-2 font-black transition-all ${
                      tipoFactura === 'A' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    FACTURA A
                  </button>
                  <button
                    onClick={() => setTipoFactura('B')}
                    className={`p-3 rounded-xl border-2 font-black transition-all ${
                      tipoFactura === 'B' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'border-slate-100 text-slate-400'
                    }`}
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
            onClick={handleConfirm}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center"
          >
            {cargando ? 'CONECTANDO CON AFIP...' : 'GENERAR COMPROBANTE'}
          </button>
          <button onClick={onClose} className="w-full p-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
