// src/app/actions/mercadopago.ts
// ─────────────────────────────────────────────
// Server Actions para integración con MercadoPago Point
// ─────────────────────────────────────────────
'use server'

import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { mpFetch } from '@/lib/mercadopago';

// ══════════════════════════════════════════════
// TERMINALES
// ══════════════════════════════════════════════

export async function getTerminalesMP() {
  await requireRole(['ADMIN']);

  try {
    const res = await mpFetch('/point/integration-api/devices');
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Error MP:', errorData);
      return { error: 'Error de autorización o conexión con MP' };
    }

    const data = await res.json();
    return { devices: Array.isArray(data.devices) ? data.devices : [] };
  } catch (error) {
    console.error(error);
    return { error: 'Error de servidor al buscar terminales' };
  }
}

export async function cambiarModoTerminal(deviceId: string, operatingMode: string) {
  await requireRole(['ADMIN']);

  try {
    const nextMode = operatingMode === 'PDV' ? 'STANDALONE' : 'PDV';
    const body = JSON.stringify({ operating_mode: nextMode });

    let res = await mpFetch(`/point/integration-api/devices/${deviceId}`, {
      method: 'PATCH',
      body,
    });

    if (res.status === 404 || res.status === 405) {
      res = await mpFetch(`/point/integration-api/devices/${deviceId}`, {
        method: 'PUT',
        body,
      });
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('Error cambiando modo terminal:', data);
      return { error: data?.message || 'No se pudo cambiar el modo.' };
    }

    return { success: true, operating_mode: data?.operating_mode || nextMode };
  } catch (error) {
    console.error(error);
    return { error: 'Error de servidor al cambiar el modo.' };
  }
}

export async function getSucursales() {
  await requireRole(['ADMIN']);
  try {
    const sucursales = await db.sucursal.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, mpDeviceId: true },
    });
    return { sucursales };
  } catch (error) {
    console.error(error);
    return { error: 'Error al cargar sucursales' };
  }
}

export async function vincularTerminal(deviceId: string, sucursalId: string) {
  await requireRole(['ADMIN']);
  try {
    // Desvincular de cualquier otra sucursal
    await db.sucursal.updateMany({
      where: { mpDeviceId: deviceId },
      data: { mpDeviceId: null },
    });

    // Asignar a la nueva
    await db.sucursal.update({
      where: { id: sucursalId },
      data: { mpDeviceId: deviceId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error Prisma:', error);
    return { error: 'No se pudo guardar la vinculación' };
  }
}

// ══════════════════════════════════════════════
// COBRO POR TERMINAL (API de Orders)
// ══════════════════════════════════════════════

export async function enviarCobroTerminal(
  sucursalId: string,
  monto: number,
  ventaId: string
) {
  try {
    const sucursal = await db.sucursal.findUnique({
      where: { id: sucursalId },
      select: { mpDeviceId: true },
    });

    if (!sucursal?.mpDeviceId) return { error: 'Sucursal sin terminal vinculada' };

    const res = await mpFetch('/v1/orders', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': `v-${ventaId}-${Date.now()}`,
      },
      body: JSON.stringify({
        type: 'point',
        external_reference: String(ventaId).substring(0, 64),
        description: `Venta #${ventaId}`.substring(0, 150),
        transactions: {
          payments: [
            {
              amount: String(monto),
            },
          ],
        },
        config: {
          point: {
            terminal_id: sucursal.mpDeviceId,
            print_on_terminal: 'seller_ticket',
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error MP enviarCobro:', data);
      return { error: data.message || 'Error al enviar cobro a MP' };
    }

    // Guardar el orderId en la venta para tracking
    await db.venta.update({
      where: { id: ventaId },
      data: { mpOrderId: data.id },
    });

    return { success: true, orderId: data.id };
  } catch (error) {
    console.error('Error enviarCobroTerminal:', error);
    return { error: 'Error de conexión' };
  }
}

// ══════════════════════════════════════════════
// CONSULTAR ESTADO DE ORDEN ← FIX PRINCIPAL
// ══════════════════════════════════════════════
// ANTES: consultarEstadoPagoIntent consultaba /payment-intents/{id}
//        pero el ID era un orderId de /v1/orders — APIs distintas.
// AHORA: consulta /v1/orders/{orderId} que es el endpoint correcto.

export async function consultarEstadoOrden(orderId: string) {
  await requireRole(['ADMIN', 'CASHIER']);

  try {
    const res = await mpFetch(`/v1/orders/${orderId}`);

    if (!res.ok) {
      console.error('Error consultando orden MP:', res.status);
      return { finalizado: false };
    }

    const data = await res.json();

    /*
      Estados de Order en MP Point:
      - "opened"     → Esperando pago en la terminal
      - "processing" → Procesando el pago
      - "processed"  → Se procesó (aprobado O rechazado)
      - "closed"     → Completada exitosamente
      - "expired"    → Expiró sin pagarse
    */

    if (data.status === 'processed' || data.status === 'closed') {
      const payment = data.transactions?.payments?.[0];
      const aprobado =
        payment?.status === 'approved' ||
        payment?.status === 'processed' ||
        data.status_detail === 'accredited';

      // Si fue aprobado, actualizar la venta en la DB
      if (aprobado && data.external_reference) {
        await db.venta.update({
          where: { id: data.external_reference },
          data: {
            estadoPago: 'APROBADO',
            mpPaymentId: payment?.id?.toString() || orderId,
          },
        });
      }

      return {
        finalizado: true,
        aprobado,
        paymentId: payment?.id,
      };
    }

    if (data.status === 'expired') {
      return { finalizado: true, aprobado: false, cancelado: true };
    }

    // Sigue en "opened" o "processing"
    return { finalizado: false };
  } catch (error) {
    console.error('Error consultando orden:', error);
    return { error: 'Error de conexión al verificar pago' };
  }
}

// ══════════════════════════════════════════════
// CANCELAR ORDEN
// ══════════════════════════════════════════════

export async function cancelarOrdenMP(orderId: string) {
  try {
    const res = await mpFetch(`/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': `c-${orderId}`,
      },
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}
