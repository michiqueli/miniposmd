import { ShoppingCart, Trash2, Minus, Plus, PencilLine } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function CartPanel({
  carrito,
  metodoPago,
  onClear,
  onIncreaseItem,
  onDecreaseItem,
  onRemoveItem,
  onAddManual,
}: {
  carrito: Array<{
    id: string;
    nombre: string;
    precioEfectivo: number;
    precioDigital: number;
    cantidad: number;
    esManual?: boolean;
  }>;
  metodoPago: 'EFECTIVO' | 'TERMINAL';
  onClear: () => void;
  onIncreaseItem: (itemId: string) => void;
  onDecreaseItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onAddManual: () => void;
}) {
  return (
    <div className="w-1/3 bg-white border-l shadow-xl flex flex-col pt-[4.5rem]">
      <div className="px-3 py-2 border-b bg-slate-50 flex items-center">
        <h2 className="font-bold flex items-center gap-2 text-slate-700 text-sm"><ShoppingCart size={18} /> Carrito</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {carrito.length === 0 && (
          <p className="text-center text-xs font-semibold text-slate-400 pt-10">Todavía no hay productos en el carrito.</p>
        )}

        {carrito.map(item => (
          <Card key={item.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-none">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 text-xs uppercase leading-tight truncate">{item.nombre}</span>
                  {item.esManual && (
                    <span className="shrink-0 text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md">
                      MANUAL
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                  ${metodoPago === 'EFECTIVO' ? Number(item.precioEfectivo).toFixed(2) : Number(item.precioDigital).toFixed(2)} c/u
                </span>
              </div>
              <span className="font-black text-slate-700 text-sm shrink-0">
                ${((metodoPago === 'EFECTIVO' ? item.precioEfectivo : item.precioDigital) * item.cantidad).toFixed(2)}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 p-0.5">
                <button
                  onClick={() => onDecreaseItem(item.id)}
                  className="h-7 w-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                  aria-label={`Restar una unidad de ${item.nombre}`}
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-6 text-center font-black text-slate-700 text-sm">{item.cantidad}</span>
                <button
                  onClick={() => onIncreaseItem(item.id)}
                  className="h-7 w-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                  aria-label={`Sumar una unidad de ${item.nombre}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.id)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600"
              >
                <Trash2 size={12} /> Quitar
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="px-3 py-3 border-t bg-slate-50 flex gap-2">
        <button
          onClick={onAddManual}
          className="w-3/4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 text-orange-600 font-bold text-sm transition-colors active:scale-[0.98]"
        >
          <PencilLine size={18} />
          + Ítem manual
        </button>
        <button
          onClick={onClear}
          className="w-1/4 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 text-red-500 font-bold text-xs transition-colors active:scale-[0.98]"
        >
          <Trash2 size={18} />
          Vaciar
        </button>
      </div>
    </div>
  );
}
