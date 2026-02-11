'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from '@/lib/auth';

export async function registrarVenta(data: {
  items: any[],
  total: number,
  metodoPago: string,
}) {
  try {
    const user = await requireRole(['ADMIN', 'CASHIER']);

    const resultado = await db.$transaction(async (tx: any) => {
      const venta = await tx.venta.create({
        data: {
          total: data.total,
          metodoPago: data.metodoPago,
          sucursalId: user.sucursalId,
          usuarioId: user.userId,
          estadoPago: data.metodoPago === 'EFECTIVO' ? 'APROBADO' : 'PENDIENTE',
        }
      });

      for (const item of data.items) {
        await tx.stockSucursal.update({
          where: {
            sucursalId_productoId: {
              sucursalId: user.sucursalId,
              productoId: item.id
            }
          },
          data: { cantidad: { decrement: item.cantidad } }
        });
      }
      return venta;
    });

    revalidatePath('/pos');
    revalidatePath('/admin/ventas');
    return { success: true, ventaId: resultado.id };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: "Error de stock o conexión" };
  }
}

export async function facturarVenta(ventaId: string, datos: { tipo: string, receptorId: string }) {
  try {
    await requireRole(['ADMIN', 'CASHIER']);

    const caeSimulado = "7400" + Math.floor(Math.random() * 1000000);
    const nroSimulado = Math.floor(Math.random() * 5000);

    await db.venta.update({
      where: { id: ventaId },
      data: {
        cae: caeSimulado,
        nroFactura: nroSimulado,
        tipoFactura: datos.tipo,
      }
    });
    revalidatePath('/admin/ventas');
    return { success: true, cae: caeSimulado, nro: nroSimulado };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
