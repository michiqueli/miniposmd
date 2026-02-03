'use client'
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FacturacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (datos: { tipo: 'A' | 'B', receptorId: string, tipoReceptor: 'CF' | 'CUIL' }) => Promise<void>;
  cargando: boolean;
}

export default function FacturacionModal({ isOpen, onClose, onConfirm, cargando }: FacturacionModalProps) {
  const [tipoReceptor, setTipoReceptor] = useState<'CF' | 'CUIL'>('CF');
  const [idReceptor, setIdReceptor] = useState('');
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (tipoReceptor === 'CUIL' && idReceptor.length < 11) {
      return alert("El CUIT debe tener 11 dígitos");
    }
    onConfirm({
      tipo: tipoFactura,
      receptorId: idReceptor || "0",
      tipoReceptor
    });
  };

  return (
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
            onClick={handleConfirm}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center"
          >
            {cargando ? "CONECTANDO CON AFIP..." : "GENERAR COMPROBANTE"}
          </button>
          <button
            onClick={onClose}
            className="w-full p-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}