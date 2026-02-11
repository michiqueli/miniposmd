'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from '@/lib/auth';

export async function anularVenta(id: string) {
  await requireRole(['ADMIN']);

  await db.venta.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  revalidatePath('/admin/ventas');
}

export async function actualizarVenta(formData: FormData) {
  await requireRole(['ADMIN']);

  const id = String(formData.get('ventaId') || '').trim();
  const metodoPago = String(formData.get('metodoPago') || '').trim();
  const estadoPago = String(formData.get('estadoPago') || '').trim();
  const tipoFacturaRaw = String(formData.get('tipoFactura') || '').trim();
  const tipoFactura = tipoFacturaRaw.length > 0 ? tipoFacturaRaw : null;

  if (!id || !['EFECTIVO', 'MP'].includes(metodoPago) || !['PENDIENTE', 'PAGADO', 'ANULADO'].includes(estadoPago)) {
    throw new Error('Datos inválidos para actualizar la venta');
  }

  await db.venta.update({
    where: { id },
    data: {
      metodoPago,
      estadoPago,
      tipoFactura,
    }
  });

  revalidatePath('/admin/ventas');
}
