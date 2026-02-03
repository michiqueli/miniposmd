'use server'
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { db } from "@/lib/db";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function crearPreferenciaMP(ventaId: string) {
  const venta = await db.venta.findUnique({ where: { id: ventaId } });
  if (!venta) return { success: false, error: "Venta no encontrada" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const preference = new Preference(client);
    
    // Convertimos el Decimal a number
    const monto = Number(venta.total);

    const result = await preference.create({
      body: {
        items: [
          {
            id: "item-venta",
            title: "Consumo en Pollería",
            unit_price: monto,
            quantity: 1,
          }
        ],
        external_reference: ventaId,
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${baseUrl}/pos`,
          failure: `${baseUrl}/pos`,
          pending: `${baseUrl}/pos`
        },
      }
    });

    return { success: true, init_point: result.init_point };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Función para verificar si ya se pagó (Polling simple para el frontend)
export async function chequearEstadoPago(ventaId: string) {
  const venta = await db.venta.findUnique({ 
    where: { id: ventaId },
    select: { estadoPago: true }
  });
  return venta?.estadoPago === 'APROBADO';
}