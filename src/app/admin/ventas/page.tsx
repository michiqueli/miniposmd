import { db } from "@/lib/db";
import VentasTable from "./components/VentasTable";
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';

type VentaListado = {
  id: string;
  numeroVenta: number;
  createdAt: Date;
  fecha: Date;
  total: { toString(): string };
  metodoPago: string;
  estadoPago: string;
  nroFactura: number | null;
  tipoFactura: string | null;
  cae: string | null;
  sucursal: { nombre: string };
  usuario: { nombre: string };
};

export default async function AdminVentasPage() {
  await requireRole(['ADMIN']);

  const ventasRaw: VentaListado[] = await db.venta.findMany({
    where: {
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 200,
    include: {
      sucursal: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
  });

  const ventas = ventasRaw.map((venta) => ({
    id: venta.id,
    numeroVenta: venta.numeroVenta,
    createdAt: venta.createdAt.toISOString(),
    fecha: venta.fecha.toISOString(),
    total: Number(venta.total.toString()),
    metodoPago: venta.metodoPago,
    estadoPago: venta.estadoPago,
    nroFactura: venta.nroFactura,
    tipoFactura: venta.tipoFactura,
    cae: venta.cae,
    sucursalNombre: venta.sucursal.nombre,
    usuarioNombre: venta.usuario.nombre,
  }));

  const sucursalOptions = [
    { label: 'Todas las sucursales', value: 'ALL' },
    ...Array.from(new Set(ventas.map((venta) => venta.sucursalNombre))).sort((a, b) => a.localeCompare(b, 'es-AR')).map((nombre) => ({
      label: nombre,
      value: nombre,
    })),
  ];

  const usuarioOptions = [
    { label: 'Todos los usuarios', value: 'ALL' },
    ...Array.from(new Set(ventas.map((venta) => venta.usuarioNombre))).sort((a, b) => a.localeCompare(b, 'es-AR')).map((nombre) => ({
      label: nombre,
      value: nombre,
    })),
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <AdminNav />
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Control de Ventas</h1>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm text-sm border border-slate-200">
          Total Ventas Visibles: <strong>{ventas.length}</strong>
        </div>
      </div>

      <VentasTable ventas={ventas} sucursalOptions={sucursalOptions} usuarioOptions={usuarioOptions} />
    </div>
  );
}
