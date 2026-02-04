'use server'

// 1. IMPORTA TU DB CORRECTAMENTE (NO HAGAS NEW PRISMACLIENT)
import { db } from "@/lib/db";

const MP_TOKEN = process.env.MP_ACCESS_TOKEN_PROD;

export async function getTerminalesMP() {
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
export async function getSucursales() {
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