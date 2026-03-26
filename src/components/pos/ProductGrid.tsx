import { Card } from '@/components/ui/Card';

export default function ProductGrid({
  productos,
  metodoPago,
  onAdd,
}: {
  productos: any[];
  metodoPago: 'EFECTIVO' | 'TERMINAL';
  onAdd: (producto: any) => void;
}) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {productos.map((p) => (
        <button key={p.id} onClick={() => onAdd(p)}>
          <Card className="h-20 rounded-xl border-2 border-transparent active:border-orange-500 hover:shadow-md transition-all flex flex-col items-center justify-center p-1.5 text-center">
            <span className="font-bold text-slate-800 uppercase text-xs leading-tight">{p.nombre}</span>
            <span className="text-orange-600 font-bold text-xs mt-0.5">
              ${metodoPago === 'EFECTIVO' ? p.precioEfectivo.toString() : p.precioDigital.toString()}
            </span>
          </Card>
        </button>
      ))}
    </div>
  );
}
