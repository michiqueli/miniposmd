// src/app/admin/ventas/actions.ts
// ─────────────────────────────────────────────
// Server Actions para gestión de ventas desde el admin
// ─────────────────────────────────────────────
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import type { DatosFacturaImpresion } from '@/lib/types';

export async function anularVenta(id: string) {
  await requireRole(['ADMIN']);

  await db.venta.update({
    where: { id },
    data: { deletedAt: new Date(), estadoPago: 'ANULADO' },
  });
  revalidatePath('/admin/ventas');
}

// ══════════════════════════════════════════════
// ACTUALIZAR VENTA (todos los campos editables)
// ══════════════════════════════════════════════

export async function actualizarVenta(formData: FormData) {
  await requireRole(['ADMIN']);

  const id = String(formData.get('ventaId') || '').trim();
  const metodoPago = String(formData.get('metodoPago') || '').trim();
  const estadoPago = String(formData.get('estadoPago') || '').trim();
  const tipoFacturaRaw = String(formData.get('tipoFactura') || '').trim();
  const tipoFactura = tipoFacturaRaw.length > 0 ? tipoFacturaRaw : null;
  const fechaRaw = String(formData.get('fecha') || '').trim();
  const totalRaw = String(formData.get('total') || '').trim();

  if (
    !id ||
    !['EFECTIVO', 'MP'].includes(metodoPago) ||
    !['PENDIENTE', 'APROBADO', 'ANULADO'].includes(estadoPago)
  ) {
    throw new Error('Datos inválidos para actualizar la venta');
  }

  const data: Record<string, unknown> = { metodoPago, estadoPago, tipoFactura };

  if (fechaRaw) {
    const fecha = new Date(fechaRaw);
    if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
    data.fecha = fecha;
  }

  if (totalRaw) {
    const total = parseFloat(totalRaw);
    if (isNaN(total) || total < 0) throw new Error('Total inválido');
    data.total = total;
  }

  await db.venta.update({ where: { id }, data });

  revalidatePath('/admin/ventas');
}

// ══════════════════════════════════════════════
// CREAR VENTA MANUAL
// ══════════════════════════════════════════════

type ItemVentaManual = {
  productoId: string
  cantidad: number
  precioUnit: number
}

export async function crearVentaManual(datos: {
  fecha: string
  metodoPago: string
  estadoPago: string
  sucursalId: string
  usuarioId: string
  items: ItemVentaManual[]
}) {
  await requireRole(['ADMIN']);

  const { fecha, metodoPago, estadoPago, sucursalId, usuarioId, items } = datos;

  if (!['EFECTIVO', 'MP'].includes(metodoPago)) {
    throw new Error('Método de pago inválido');
  }
  if (!['PENDIENTE', 'APROBADO', 'ANULADO'].includes(estadoPago)) {
    throw new Error('Estado de pago inválido');
  }
  if (!items.length) {
    throw new Error('Debe agregar al menos un producto');
  }

  const fechaParsed = new Date(fecha);
  if (isNaN(fechaParsed.getTime())) throw new Error('Fecha inválida');

  const total = items.reduce((sum, it) => sum + it.cantidad * it.precioUnit, 0);

  await db.$transaction(async (tx) => {
    await tx.venta.create({
      data: {
        fecha: fechaParsed,
        total,
        metodoPago,
        estadoPago,
        sucursalId,
        usuarioId,
        items: {
          create: items.map((it) => ({
            cantidad: it.cantidad,
            precioUnit: it.precioUnit,
            subtotal: it.cantidad * it.precioUnit,
            productoId: it.productoId,
          })),
        },
      },
    });
  });

  revalidatePath('/admin/ventas');
}

// ══════════════════════════════════════════════
// REIMPRESIÓN DE FACTURA
// ══════════════════════════════════════════════

export async function obtenerDatosFactura(
  ventaId: string
): Promise<{ success: true; factura: DatosFacturaImpresion } | { error: string }> {
  await requireRole(['ADMIN', 'CASHIER']);

  const venta = await db.venta.findUnique({
    where: { id: ventaId },
    include: {
      sucursal: true,
      usuario: true,
      items: {
        include: { producto: true },
      },
    },
  });

  if (!venta) return { error: 'Venta no encontrada' };
  if (!venta.cae) return { error: 'Esta venta no tiene factura emitida' };

  const total = Number(venta.total);
  const esRI = venta.sucursal.regimen === 'RI';

  const items = venta.items.map((item: any) => ({
    nombre: item.producto.nombre,
    cantidad: item.cantidad,
    precioUnit: Number(item.precioUnit),
    subtotal: Number(item.subtotal),
  }));

  return {
    success: true,
    factura: {
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
      razonSocialReceptor: venta.razonSocialReceptor || null,
      total,
      neto: esRI ? +(total / 1.21).toFixed(2) : total,
      iva: esRI ? +(total - total / 1.21).toFixed(2) : 0,
      metodoPago: venta.metodoPago,
      vendedor: venta.usuario.nombre,
      items,
    },
  };
}
