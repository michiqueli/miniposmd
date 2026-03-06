import { listarCompras } from './actions';
import ComprasTable from './components/ComprasTable';

export default async function AdminComprasPage() {
  const compras = await listarCompras();

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Control de Compras</h1>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm text-sm border border-slate-200">
          Total Compras: <strong>{compras.length}</strong>
        </div>
      </div>
      <ComprasTable compras={compras} />
    </div>
  );
}
