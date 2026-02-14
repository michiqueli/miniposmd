'use server'

// 1. IMPORTA TU DB CORRECTAMENTE (NO HAGAS NEW PRISMACLIENT)
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const MP_TOKEN = process.env.MP_ACCESS_TOKEN_PROD;

export async function getTerminalesMP() {
  await requireRole(['ADMIN']);
  if (!MP_TOKEN) return { error: "Falta el Access Token de Mercado Pago" };

  try {
    const res = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error("Error MP:", errorData);
      return { error: "Error de autorización o conexión con MP" };
    }

    const data = await res.json();
    return { devices: Array.isArray(data.devices) ? data.devices : [] };
  } catch (error) {
    console.error(error);
    return { error: "Error de servidor al buscar terminales" };
  }
}

// --- Nueva: Obtener lista de Sucursales ---


export async function cambiarModoTerminal(deviceId: string, operatingMode: string) {
  await requireRole(['ADMIN']);
  if (!MP_TOKEN) return { error: 'Falta el Access Token de Mercado Pago' };

  try {
    const nextMode = operatingMode === 'PDV' ? 'STANDALONE' : 'PDV';
    const payload = { operating_mode: nextMode };

    const doRequest = async (method: 'PATCH' | 'PUT') =>
      fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}`, {
        method,
        headers: {
          Authorization: `Bearer ${MP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    let res = await doRequest('PATCH');

    if (res.status === 404 || res.status === 405) {
      res = await doRequest('PUT');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('Error cambiando modo terminal MP:', data);
      return { error: data?.message || 'No se pudo cambiar el modo de la terminal.' };
    }

    return { success: true, operating_mode: data?.operating_mode || nextMode };
  } catch (error) {
    console.error(error);
    return { error: 'Error de servidor al cambiar el modo de la terminal.' };
  }
}
export async function getSucursales() {
  await requireRole(['ADMIN']);
  try {
    const sucursales = await db.sucursal.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, mpDeviceId: true } // Traemos esto para ver si ya tienen terminal
    });
    return { sucursales };
  } catch (error) {
    console.error(error);
    return { error: "Error al cargar sucursales" };
  }
}

/**
 * Nueva función para cambiar el modo de la terminal vía API
 */
export async function configurarModoTerminal(deviceId: string, modo: 'PDV' | 'STANDALONE') {
  if (!MP_TOKEN) return { error: "Falta el Access Token" };

  try {
    const res = await fetch(`https://api.mercadopago.com/terminals/v1/setup`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        terminals: [
          {
            id: deviceId,
            operating_mode: modo
          }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error al configurar modo terminal:", data);
      return { error: data.message || "No se pudo cambiar el modo de la terminal" };
    }

    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { error: "Error de red al configurar terminal" };
  }
}

export async function vincularTerminal(deviceId: string, sucursalId: string) {
  await requireRole(['ADMIN']);
  try {
    // 1. Cambiamos el modo de la terminal a PDV en Mercado Pago
    // Lo hacemos primero para asegurar que la terminal sea compatible antes de guardar en DB
    const configRes = await configurarModoTerminal(deviceId, 'STANDALONE');

    if (configRes.error) {
      return { error: `Mercado Pago no permitió configurar la terminal: ${configRes.error}` };
    }

    // 2. Desvincular esta terminal de cualquier otra sucursal previa
    await db.sucursal.updateMany({
      where: { mpDeviceId: deviceId },
      data: { mpDeviceId: null }
    });

    // 3. Asignar a la nueva sucursal
    await db.sucursal.update({
      where: { id: sucursalId },
      data: { mpDeviceId: deviceId }
    });

    return { success: true };
  } catch (error) {
    console.error("Error Prisma:", error);
    return { error: "No se pudo guardar la vinculación en la DB" };
  }
}

export async function consultarEstadoPagoIntent(paymentIntentId: string) {
  await requireRole(['ADMIN', 'CASHIER']);
  try {
    // Consultamos el estado de la Intención de Pago (lo que mandamos a la maquinita)
    const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN_PROD}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    const data = await res.json();

    /* Estados posibles de payment_intent (data.state):
      - OPEN: Esperando tarjeta
      - ON_TERMINAL: Procesando en la maquinita
      - PROCESSED: Ya terminó (aprobado o rechazado)
      - CANCELED: Se canceló
      - ABANDONED: Pasó mucho tiempo
    */

    if (data.state === 'PROCESSED') {
      // Si ya se procesó, buscamos el ID del pago real para ver si fue Aprobado o Rechazado
      // El payment_id suele venir en data.payment.id
      return {
        finalizado: true,
        aprobado: data.payment?.status === 'approved',
        paymentId: data.payment?.id
      };
    } else if (data.state === 'CANCELED' || data.state === 'ABANDONED') {
      return { finalizado: true, aprobado: false, cancelado: true };
    }

    // Si sigue OPEN o ON_TERMINAL
    return { finalizado: false };

  } catch (error) {
    console.error("Error consultando intent:", error);
    return { error: "Error de conexión al verificar pago" };
  }
}

export async function cancelarOrdenMP(orderId: string) {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN_PROD}`,
        'X-Idempotency-Key': `c-${orderId}`
      }
    });
    return { success: res.ok };
  } catch (error) {
    return { success: false };
  }
}

export async function enviarCobroTerminal(sucursalId: string, monto: number, ventaId: string) {
  try {
    const sucursal = await db.sucursal.findUnique({
      where: { id: sucursalId },
      select: { mpDeviceId: true }
    });

    if (!sucursal?.mpDeviceId) return { error: "Sucursal sin terminal vinculada" };

    // Formato de la nueva API de Orders
    const res = await fetch(`https://api.mercadopago.com/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN_PROD}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `v-${ventaId}-${Date.now()}`
      },
      body: JSON.stringify({
        type: "point",
        external_reference: ventaId,
        transactions: [{
          amount: monto,
          description: `Venta #${ventaId}`
        }],
        point: {
          terminal_id: sucursal.mpDeviceId,
          print_on_terminal: "seller_ticket"
        }
      })
    });

    const data = await res.json();
    if (!res.ok) return { error: data.message || "Error MP" };

    return { success: true, orderId: data.id };
  } catch (e) {
    return { error: "Error de conexión" };
  }
}