// src/app/pos/actions.ts
// ─────────────────────────────────────────────
// Server Actions del POS: registrar venta y facturar
// ─────────────────────────────────────────────
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { emitirFactura } from '@/lib/afip';

// ══════════════════════════════════════════════
// REGISTRAR VENTA (ahora guarda ítems detallados)
// ══════════════════════════════════════════════

export async function registrarVenta(data: {
  items: Array<{
    id: string;
    nombre: string;
    precioEfectivo: number;
    precioDigital: number;
    cantidad: number;
  }>;
  total: number;
  metodoPago: string;
}) {
  try {
    const user = await requireRole(['ADMIN', 'CASHIER']);

    const resultado = await db.$transaction(async (tx: any) => {
      // 1. Crear la venta
      const venta = await tx.venta.create({
        data: {
          total: data.total,
          metodoPago: data.metodoPago === 'TERMINAL' ? 'MP' : data.metodoPago,
          sucursalId: user.sucursalId,
          usuarioId: user.userId,
          estadoPago: data.metodoPago === 'EFECTIVO' ? 'APROBADO' : 'PENDIENTE',
        },
      });

      // 2. Crear los ítems de la venta (NUEVO — detalle para contabilidad)
      const isEfectivo = data.metodoPago === 'EFECTIVO';
      for (const item of data.items) {
        const precioUnit = isEfectivo ? item.precioEfectivo : item.precioDigital;
        await tx.ventaItem.create({
          data: {
            ventaId: venta.id,
            productoId: item.id,
            cantidad: item.cantidad,
            precioUnit: precioUnit,
            subtotal: precioUnit * item.cantidad,
          },
        });
      }

      // 3. Descontar stock
      for (const item of data.items) {
        await tx.stockSucursal.update({
          where: {
            sucursalId_productoId: {
              sucursalId: user.sucursalId,
              productoId: item.id,
            },
          },
          data: { cantidad: { decrement: item.cantidad } },
        });
      }

      return venta;
    });

    revalidatePath('/pos');
    revalidatePath('/admin/ventas');
    return { success: true, ventaId: resultado.id };
  } catch (error: unknown) {
    console.error(error);
    return { success: false, error: 'Error de stock o conexión' };
  }
}

// ══════════════════════════════════════════════
// FACTURAR VENTA (AFIP real, reemplaza la simulación)
// ══════════════════════════════════════════════

export async function facturarVenta(
  ventaId: string,
  datos: { tipo: string; receptorId: string }
) {
  try {
    await requireRole(['ADMIN', 'CASHIER']);

    const venta = await db.venta.findUnique({
      where: { id: ventaId },
      include: { sucursal: true },
    });
    if (!venta) return { success: false, error: 'Venta no encontrada' };

    const total = Number(venta.total);

    // ── Determinar tipo de comprobante según régimen ──
    let tipoComprobante: number;
    if (venta.sucursal.regimen === 'MONO') {
      tipoComprobante = 11; // Factura C
    } else {
      tipoComprobante = datos.tipo === 'A' ? 1 : 6; // Factura A o B
    }

    // ── Calcular neto e IVA ──
    const esRI = venta.sucursal.regimen === 'RI';
    const importeNeto = esRI ? +(total / 1.21).toFixed(2) : total;
    const importeIVA = esRI ? +(total - importeNeto).toFixed(2) : 0;

    // ── Tipo de documento del receptor ──
    const sinIdentificar = !datos.receptorId || datos.receptorId === '0';
    const docTipo = sinIdentificar ? 99 : 80; // 99=CF, 80=CUIT
    const docNro = sinIdentificar ? 0 : parseInt(datos.receptorId, 10);
console.log("Antes de llamar a emitir factura")
    // ── Emitir factura en AFIP ──
    const resultado = await emitirFactura({
      puntoVenta: venta.sucursal.puntoVenta,
      tipoComprobante,
      concepto: 1, // Productos
      docTipo,
      docNro,
      importeTotal: total,
      importeNeto,
      importeIVA,
      alicuotaIVA: 5, // 21%
    });
console.log("Resultado en facturaVenta", resultado)
    // ── Guardar en la DB ──
    await db.venta.update({
      where: { id: ventaId },
      data: {
        cae: resultado.cae,
        caeVencimiento: resultado.caeVencimiento,
        nroFactura: resultado.nroComprobante,
        tipoFactura: datos.tipo,
        docReceptor: sinIdentificar ? null : datos.receptorId,
      },
    });

    revalidatePath('/admin/ventas');
    return {
      success: true,
      cae: resultado.cae,
      nro: resultado.nroComprobante,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error de comunicación con AFIP';
    console.error('Error AFIP:', error);
    return { success: false, error: msg };
  }
}
