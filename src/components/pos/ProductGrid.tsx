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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {productos.map((p) => (
        <button key={p.id} onClick={() => onAdd(p)}>
          <Card className="h-32 rounded-2xl border-2 border-transparent active:border-orange-500 hover:shadow-md transition-all flex flex-col items-center justify-center p-2 text-center">
            <span className="font-bold text-slate-800 uppercase text-sm">{p.nombre}</span>
            <span className="text-orange-600 font-bold mt-1">
              ${metodoPago === 'EFECTIVO' ? p.precioEfectivo.toString() : p.precioDigital.toString()}
            </span>
          </Card>
        </button>
      ))}
    </div>
  );
}
