// src/app/admin/ventas/page.tsx
// ─────────────────────────────────────────────
// Página de ventas del admin
// ─────────────────────────────────────────────

import { db } from '@/lib/db';
import VentasTable from './components/VentasTable';

export default async function AdminVentasPage() {
  const [ventasRaw, productosRaw, sucursalesRaw, usuariosRaw] = await Promise.all([
    db.venta.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        sucursal: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
    db.producto.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, precioEfectivo: true, precioDigital: true, categoria: true },
    }),
    db.sucursal.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    }),
    db.usuario.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, sucursalId: true },
    }),
  ]);

  const ventas = ventasRaw.map((venta: typeof ventasRaw[number]) => ({
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

  const productos = productosRaw.map((p: typeof productosRaw[number]) => ({
    id: p.id,
    nombre: p.nombre,
    precioEfectivo: Number(p.precioEfectivo),
    precioDigital: Number(p.precioDigital),
    categoria: p.categoria,
  }));

  const sucursales = sucursalesRaw.map((s: typeof sucursalesRaw[number]) => ({ id: s.id, nombre: s.nombre }));
  const usuarios = usuariosRaw.map((u: typeof usuariosRaw[number]) => ({ id: u.id, nombre: u.nombre, sucursalId: u.sucursalId }));

  const sucursalOptions = [
    { label: 'Todas las sucursales', value: 'ALL' },
    ...(Array.from(new Set(ventas.map((v: typeof ventas[number]) => v.sucursalNombre))) as string[])
      .sort((a: string, b: string) => a.localeCompare(b, 'es-AR'))
      .map((nombre: string) => ({ label: nombre, value: nombre })),
  ];

  const usuarioOptions = [
    { label: 'Todos los usuarios', value: 'ALL' },
    ...(Array.from(new Set(ventas.map((v: typeof ventas[number]) => v.usuarioNombre))) as string[])
      .sort((a: string, b: string) => a.localeCompare(b, 'es-AR'))
      .map((nombre: string) => ({ label: nombre, value: nombre })),
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
        productos={productos}
        sucursales={sucursales}
        usuarios={usuarios}
      />
    </div>
  );
}
