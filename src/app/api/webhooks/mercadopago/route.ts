import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from "@/lib/db";
import crypto from "crypto"; // Para el HMAC SHA256

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN_PROD! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers = request.headers;
    
    // 1. OBTENER DATOS PARA VALIDACIÓN
    const xSignature = headers.get("x-signature");
    const xRequestId = headers.get("x-request-id");
    const secret = process.env.MP_WEBHOOK_SECRET!; // Tu Clave Secreta de "Tus Integraciones"

    // Si no hay firma y no es QR (que no lleva), desconfiamos
    if (!xSignature || !xRequestId) {
      console.warn("⚠️ Notificación sin firma de seguridad.");
      // Podés elegir bloquearla o dejarla pasar mientras testeas
    } else {
      // 2. EXTRAER TS Y V1 DEL HEADER
      // Ejemplo header: ts=12345,v1=abcd...
      const parts = xSignature.split(",");
      const ts = parts.find(p => p.startsWith("ts="))?.split("=")[1];
      const v1 = parts.find(p => p.startsWith("v1="))?.split("=")[1];

      // 3. ARMAR EL MANIFIESTO Y COMPARAR
      const dataId = body.data?.id || body.id;
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      
      const hmac = crypto.createHmac("sha256", secret);
      const digest = hmac.update(manifest).digest("hex");

      if (digest !== v1) {
        console.error("❌ Firma de Webhook INVÁLIDA. Posible intento de fraude.");
        return NextResponse.json({ status: "FORBIDDEN" }, { status: 403 });
      }
      console.log("✅ Firma verificada con éxito.");
    }

    // --- EL RESTO DE TU LÓGICA DE PROCESAMIENTO ---
    const topic = body.type || body.action;
    const paymentId = body.data?.id || body.data?.transactions?.payments?.[0]?.id || body.id;

    if ((topic === "payment" || topic === "order" || topic === "merchant_order") && paymentId) {
      const payment = new Payment(client);
      const data = await payment.get({ id: String(paymentId) });

      if (data.status === 'approved') {
        const ventaId = data.external_reference;
        if (ventaId) {
          await db.venta.update({
            where: { id: ventaId },
            data: { estadoPago: 'APROBADO', metodoPago: 'MP' }
          });
          console.log(`✅ Venta ${ventaId} actualizada.`);
        }
      }
    }

    return NextResponse.json({ status: "OK" }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message);
    return NextResponse.json({ status: "ERROR" }, { status: 200 });
  }
}