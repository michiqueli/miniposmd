import { db } from "@/lib/db";
import VentasTable from "./components/VentasTable";

export default async function AdminVentasPage() {
  // Traemos ventas que NO estén anuladas (deletedAt: null)
  const ventasRaw = await db.venta.findMany({
    where: {
      deletedAt: null 
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50 // Traemos las últimas 50 para que sea rápido
  });

  // Convertimos Decimal a Number (Serialización obligatoria)
  const ventas = ventasRaw.map(v => ({
    ...v,
    total: Number(v.total),
  }));

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Control de Ventas</h1>
        <div className="bg-white px-4 py-2 rounded shadow text-sm">
          Total Ventas Visibles: <strong>{ventas.length}</strong>
        </div>
      </div>
      
      <VentasTable ventas={ventas} />
    </div>
  );
}