'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Anular Venta (Soft Delete)
export async function anularVenta(id: string) {
  await db.venta.update({
    where: { id },
    data: { deletedAt: new Date() } // Ponemos fecha de hoy = Borrado
  });
  revalidatePath('/admin/ventas');
}

// 2. Editar Venta (Solo datos básicos por seguridad)
export async function actualizarVenta(id: string, nuevoMetodo: string, nuevoEstado: string) {
  await db.venta.update({
    where: { id },
    data: { 
      metodoPago: nuevoMetodo,
      estadoPago: nuevoEstado
    }
  });
  revalidatePath('/admin/ventas');
}