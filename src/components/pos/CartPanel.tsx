import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function CartPanel({
  carrito,
  metodoPago,
  onClear,
  onIncreaseItem,
  onDecreaseItem,
  onRemoveItem,
}: {
  carrito: Array<{
    id: string;
    nombre: string;
    precioEfectivo: number;
    precioDigital: number;
    cantidad: number;
  }>;
  metodoPago: 'EFECTIVO' | 'TERMINAL';
  onClear: () => void;
  onIncreaseItem: (itemId: string) => void;
  onDecreaseItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <div className="w-1/3 bg-white border-l shadow-xl flex flex-col pt-20">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2 text-slate-700"><ShoppingCart size={20} /> Carrito</h2>
        <button onClick={onClear} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {carrito.length === 0 && (
          <p className="text-center text-sm font-semibold text-slate-400 pt-10">Todavía no hay productos en el carrito.</p>
        )}

        {carrito.map(item => (
          <Card key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-sm uppercase leading-tight">{item.nombre}</span>
                <span className="text-xs font-bold text-slate-400 mt-1">
                  ${metodoPago === 'EFECTIVO' ? Number(item.precioEfectivo).toFixed(2) : Number(item.precioDigital).toFixed(2)} c/u
                </span>
              </div>
              <span className="font-black text-slate-700 text-lg">
                ${((metodoPago === 'EFECTIVO' ? item.precioEfectivo : item.precioDigital) * item.cantidad).toFixed(2)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
                <button
                  onClick={() => onDecreaseItem(item.id)}
                  className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                  aria-label={`Restar una unidad de ${item.nombre}`}
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-8 text-center font-black text-slate-700">{item.cantidad}</span>
                <button
                  onClick={() => onIncreaseItem(item.id)}
                  className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                  aria-label={`Sumar una unidad de ${item.nombre}`}
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"
              >
                <Trash2 size={14} /> Quitar
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
