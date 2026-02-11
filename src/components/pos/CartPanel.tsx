import { ShoppingCart, Trash2, CreditCard, Banknote, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function CartPanel({
  carrito,
  metodoPago,
  setMetodoPago,
  total,
  cargando,
  onClear,
  onCheckout,
}: {
  carrito: any[];
  metodoPago: 'EFECTIVO' | 'TERMINAL';
  setMetodoPago: (value: 'EFECTIVO' | 'TERMINAL') => void;
  total: number;
  cargando: boolean;
  onClear: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="w-1/3 bg-white border-l shadow-xl flex flex-col pt-20">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2 text-slate-700"><ShoppingCart size={20} /> Carrito</h2>
        <button onClick={onClear} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {carrito.map(item => (
          <Card key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-none">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-sm uppercase">{item.nombre}</span>
              <span className="text-xs font-bold text-slate-400">CANT: {item.cantidad}</span>
            </div>
            <span className="font-black text-slate-700">${((metodoPago === 'EFECTIVO' ? item.precioEfectivo : item.precioDigital) * item.cantidad).toFixed(2)}</span>
          </Card>
        ))}
      </div>

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
        <Button
          disabled={cargando || carrito.length === 0}
          onClick={onCheckout}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {cargando ? <Loader2 className="animate-spin" /> : 'COBRAR'}
        </Button>
      </div>
    </div>
  );
}
