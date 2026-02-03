'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function registrarVenta(data: {
  items: any[],
  total: number,
  metodoPago: string,
  sucursalId: string,
  usuarioId: string,
}) {
  try {
    const resultado = await db.$transaction(async (tx: any) => {
      // 1. Crear la venta (Efectivo nace aprobado, MP nace pendiente)
      const venta = await tx.venta.create({
        data: {
          total: data.total,
          metodoPago: data.metodoPago,
          sucursalId: data.sucursalId,
          usuarioId: data.usuarioId,
          estadoPago: data.metodoPago === 'EFECTIVO' ? 'APROBADO' : 'PENDIENTE',
        }
      });

      // 2. Descontar Stock
      for (const item of data.items) {
        await tx.stockSucursal.update({
          where: {
            sucursalId_productoId: {
              sucursalId: data.sucursalId,
              productoId: item.id
            }
          },
          data: { cantidad: { decrement: item.cantidad } }
        });
      }
      return venta;
    });

    revalidatePath('/pos');
    return { success: true, ventaId: resultado.id };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: "Error de stock o conexión" };
  }
}

export async function facturarVenta(ventaId: string, datos: { tipo: string, receptorId: string }) {
  try {
    // Aquí es donde meterías afip.js en el futuro
    // Por ahora simulamos el éxito de AFIP
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