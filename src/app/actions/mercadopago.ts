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

export async function vincularTerminal(deviceId: string, sucursalId: string) {
  await requireRole(['ADMIN']);
  try {
    // Primero: Opcional - Desvincular esta terminal de cualquier otra sucursal para evitar duplicados
    await db.sucursal.updateMany({
      where: { mpDeviceId: deviceId },
      data: { mpDeviceId: null }
    });

    // Asignar a la nueva sucursal
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

export async function enviarCobroTerminal(sucursalId: string, monto: number, referencia: string = "VENTA-GENERICA") {
  await requireRole(['ADMIN', 'CASHIER']);
  try {
    // 1. Buscamos el ID del dispositivo en la DB usando TU import { db }
    const sucursal = await db.sucursal.findUnique({
      where: { id: sucursalId },
      select: { mpDeviceId: true, nombre: true }
    });

    if (!sucursal || !sucursal.mpDeviceId) {
      return { error: `La sucursal ${sucursal?.nombre || ''} no tiene una terminal vinculada.` };
    }

    const deviceId = sucursal.mpDeviceId;
    console.log(`Enviando cobro de $${monto} a la terminal ${deviceId}...`);

    // 2. Enviamos la orden a la API de Mercado Pago Point
    // OJO: El monto va directo, ej: 1500.50
    const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN_PROD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: monto,
        additional_info: {
          external_reference: referencia, // Aquí pones el ID de tu Ticket/Mesa
          print_on_terminal: true // Para que imprima el ticket si la terminal tiene impresora
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error MP API:", data);
      // Errores comunes: Terminal ocupada, terminal apagada, token inválido
      return { error: data.message || "Error al comunicarse con la terminal." };
    }

    // Retornamos el ID de la intención de pago (lo necesitaremos para saber si pagó)
    return {
      success: true,
      paymentIntentId: data.id,
      status: 'waiting_for_payment' // MP devuelve estado inicial
    };

  } catch (error) {
    console.error("Error Server Action:", error);
    return { error: "Error interno al procesar el cobro." };
  }
}