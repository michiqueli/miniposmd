import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from "@/lib/db";
import crypto from "crypto";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN_PROD! });

export async function POST(request: Request) {
  try {
    // --- VALIDACIÓN DE SEGURIDAD (Opcional pero recomendado) ---
    // Si quieres usar la clave secreta para validar la firma X-Signature, 
    // MP usa un algoritmo HMAC SHA256. 
    // Por ahora, procesaremos los datos y validaremos obteniendo la info oficial de la API.

    const body = await request.json();
    const url = new URL(request.url);
    
    // Mercado Pago envía el ID y el tipo de evento de dos formas según la versión
    const topic = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
    const id = body.data?.id || url.searchParams.get("data.id") || body.id || url.searchParams.get("id");

    console.log(`🔔 Webhook recibido: ${topic} ID: ${id}`);

    // 1. MANEJO DE PAGOS (El más importante para Point y Preferencias)
    if (topic === "payment" && id) {
      const payment = new Payment(client);
      const data = await payment.get({ id });

      if (data.status === 'approved') {
        const ventaId = data.external_reference;

        if (ventaId) {
          await db.venta.update({
            where: { id: ventaId },
            data: { 
              estadoPago: 'APROBADO',
              metodoPago: 'MP' 
            }
          });
          console.log(`✅ Venta ${ventaId} marcada como PAGADA.`);
        }
      }
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    // 2. MANEJO DE MERCHANT ORDERS (Flujo de Orders que pasaste)
    if (topic === "merchant_order") {
      // Generalmente aquí podrías consultar la orden completa, 
      // pero con el evento "payment" ya es suficiente para cobrar.
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    // 3. MANEJO DE INTEGRACIONES POINT (Cambios de estado en la terminal)
    if (topic === "point_integration_intent") {
      // Este avisa cuando la terminal tomó la orden o si se canceló en el dispositivo
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    // Respuesta para cualquier otro evento no mapeado
    return NextResponse.json({ status: "OK" }, { status: 200 });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    // Respondemos 200 siempre para que MP no reintente infinitamente si es un error de lógica
    return NextResponse.json({ status: "ERROR" }, { status: 200 });
  }
}