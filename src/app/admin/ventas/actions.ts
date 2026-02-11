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

export async function actualizarVenta(id: string, nuevoMetodo: string, nuevoEstado: string) {
  await requireRole(['ADMIN']);

  await db.venta.update({
    where: { id },
    data: { 
      metodoPago: nuevoMetodo,
      estadoPago: nuevoEstado
    }
  });
  revalidatePath('/admin/ventas');
}
