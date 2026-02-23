// src/app/api/webhooks/mercadopago/route.ts
// ─────────────────────────────────────────────
// Webhook de MercadoPago — maneja tanto API de Orders como legacy Payments
// ─────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '@/lib/db';
import { mpFetch } from '@/lib/mercadopago';
import crypto from 'crypto';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN_PROD!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers = request.headers;

    console.log('📩 Webhook MP recibido:', JSON.stringify(body, null, 2));

    // ── 1. VALIDACIÓN DE FIRMA ──
    const xSignature = headers.get('x-signature');
    const xRequestId = headers.get('x-request-id');
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (xSignature && xRequestId && secret) {
      const parts = xSignature.split(',');
      const ts = parts.find((p) => p.startsWith('ts='))?.split('=')[1];
      const v1 = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

      const dataId = body.data?.id || body.id;
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

      if (digest !== v1) {
        console.error('❌ Firma de Webhook INVÁLIDA');
        return NextResponse.json({ status: 'FORBIDDEN' }, { status: 403 });
      }
      console.log('✅ Firma verificada');
    }

    const topic = body.type || body.topic || body.action;

    // ── 2. NOTIFICACIONES DE LA API DE ORDERS (nueva) ──
    if (
      topic === 'topic_order_paid_wh' ||
      topic === 'topic_order_wh' ||
      body.resource?.includes('/orders/')
    ) {
      const resourceUrl = body.resource;
      if (resourceUrl) {
        const orderRes = await mpFetch(new URL(resourceUrl).pathname);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const payment = orderData.transactions?.payments?.[0];
          const aprobado =
            payment?.status === 'approved' ||
            payment?.status === 'processed' ||
            orderData.status === 'closed';

          if (aprobado && orderData.external_reference) {
            await db.venta.update({
              where: { id: orderData.external_reference },
              data: {
                estadoPago: 'APROBADO',
                mpPaymentId: payment?.id?.toString() || orderData.id,
              },
            });
            console.log(`✅ Venta ${orderData.external_reference} APROBADA via webhook Orders`);
          }
        }
      }
    }

    // ── 3. NOTIFICACIONES LEGACY DE PAYMENT ──
    if (topic === 'payment' && body.data?.id) {
      try {
        const payment = new Payment(client);
        const data = await payment.get({ id: String(body.data.id) });

        if (data.status === 'approved' && data.external_reference) {
          await db.venta.update({
            where: { id: data.external_reference },
            data: {
              estadoPago: 'APROBADO',
              mpPaymentId: String(data.id),
            },
          });
          console.log(`✅ Venta ${data.external_reference} APROBADA via webhook Payment`);
        }
      } catch (err) {
        console.error('Error procesando payment webhook:', err);
      }
    }

    // SIEMPRE devolver 200 para que MP no re-intente
    return NextResponse.json({ status: 'OK' }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Webhook error:', msg);
    return NextResponse.json({ status: 'ERROR' }, { status: 200 });
  }
}
