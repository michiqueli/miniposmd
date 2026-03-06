// src/app/factura/[ventaId]/page.tsx
// Página de factura estilo AFIP — 3 copias: Original, Duplicado, Triplicado
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import FacturaView from './FacturaView';
import type { DatosFacturaImpresion } from '@/lib/types';

type Props = { params: Promise<{ ventaId: string }> };

export default async function FacturaPage({ params }: Props) {
  const { ventaId } = await params;

  const venta = await db.venta.findUnique({
    where: { id: ventaId },
    include: {
      sucursal: true,
      usuario: true,
      items: { include: { producto: true } },
    },
  });

  if (!venta || !venta.cae) notFound();

  const total = Number(venta.total);
  const esRI = venta.sucursal.regimen === 'RI';

  const factura: DatosFacturaImpresion = {
    tipo: venta.tipoFactura,
    numero: venta.nroFactura,
    puntoVenta: venta.sucursal.puntoVenta,
    fecha: venta.fecha.toISOString(),
    cae: venta.cae,
    caeVencimiento: venta.caeVencimiento,
    cuit: venta.sucursal.cuit,
    razonSocial: venta.sucursal.razonSocial || venta.sucursal.nombre,
    nombreComercial: venta.sucursal.nombre,
    direccion: venta.sucursal.direccion,
    regimen: venta.sucursal.regimen,
    ingresosBrutos: venta.sucursal.ingresosBrutos || venta.sucursal.cuit,
    inicioActividades: venta.sucursal.inicioActividades || '',
    docReceptor: venta.docReceptor,
    total,
    neto: esRI ? +(total / 1.21).toFixed(2) : total,
    iva: esRI ? +(total - total / 1.21).toFixed(2) : 0,
    metodoPago: venta.metodoPago,
    vendedor: venta.usuario.nombre,
    items: venta.items.map((item: any) => ({
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precioUnit: Number(item.precioUnit),
      subtotal: Number(item.subtotal),
    })),
  };

  return <FacturaView factura={factura} />;
}
