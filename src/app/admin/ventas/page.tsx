// src/app/admin/ventas/page.tsx
// ─────────────────────────────────────────────
// Página de ventas del admin
// CAMBIOS:
//   - Ya no importa AdminNav ni llama requireRole (lo hace el layout)
//   - Agrega caeVencimiento y docReceptor al serializar
// ─────────────────────────────────────────────

import { db } from '@/lib/db';
import VentasTable from './components/VentasTable';

export default async function AdminVentasPage() {
  // requireRole ya se ejecutó en el layout

  const ventasRaw = await db.venta.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
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
    caeVencimiento: venta.caeVencimiento ?? null,
    docReceptor: venta.docReceptor ?? null,
    sucursalNombre: venta.sucursal.nombre,
    usuarioNombre: venta.usuario.nombre,
  }));

  const sucursalOptions = [
    { label: 'Todas las sucursales', value: 'ALL' },
    ...Array.from(new Set(ventas.map((v) => v.sucursalNombre)))
      .sort((a, b) => a.localeCompare(b, 'es-AR'))
      .map((nombre) => ({ label: nombre, value: nombre })),
  ];

  const usuarioOptions = [
    { label: 'Todos los usuarios', value: 'ALL' },
    ...Array.from(new Set(ventas.map((v) => v.usuarioNombre)))
      .sort((a, b) => a.localeCompare(b, 'es-AR'))
      .map((nombre) => ({ label: nombre, value: nombre })),
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Control de Ventas</h1>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm text-sm border border-slate-200">
          Total Ventas Visibles: <strong>{ventas.length}</strong>
        </div>
      </div>
      <VentasTable
        ventas={ventas}
        sucursalOptions={sucursalOptions}
        usuarioOptions={usuarioOptions}
      />
    </div>
  );
}
