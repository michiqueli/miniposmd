import { db } from "@/lib/db";
import VentasTable from "./components/VentasTable";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';

export default async function AdminVentasPage() {
  await requireRole(['ADMIN']);

  const ventasRaw = await db.venta.findMany({
    where: {
      deletedAt: null 
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  });

  const ventas = ventasRaw.map((v: any) => ({
    ...v,
    total: Number(v.total),
  }));

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <AdminNav />
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
