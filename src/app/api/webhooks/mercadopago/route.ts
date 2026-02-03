import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from "@/lib/db";

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    // 1. MP nos manda info en la URL (id, topic)
    const url = new URL(request.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");

    if (topic === "payment" && paymentId) {
      const payment = new Payment(client);
      const data = await payment.get({ id: paymentId });
      
      // 2. Si el pago está aprobado
      if (data.status === 'approved') {
        const ventaId = data.external_reference;

        if (ventaId) {
          // 3. Actualizamos nuestra base de datos
          await db.venta.update({
            where: { id: ventaId },
            data: { 
              estadoPago: 'APROBADO',
              metodoPago: 'MP' // Confirmamos que fue MP
            }
          });
          console.log(`✅ Pago aprobado para venta ${ventaId}`);
        }
      }
    }

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ERROR" }, { status: 500 });
  }
}