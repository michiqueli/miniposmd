'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export type DatosExtraidos = {
  cuitProveedor: string | null;
  nombreProveedor: string | null;
  tipoComprobante: string | null; // "A" | "B" | "C" | "X"
  nroComprobante: string | null;
  fecha: string | null; // YYYY-MM-DD
  montoTotal: number | null;
  netoGravado: number | null;
  ivaDiscriminado: number | null;
  descripcion: string | null;
};

/**
 * Usa Gemini Vision (gratis) para extraer datos de una foto de factura/ticket.
 * Recibe la imagen como base64 y retorna los campos estructurados.
 */
export async function extraerDatosFactura(
  base64Image: string,
  mimeType: string
): Promise<DatosExtraidos> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta GEMINI_API_KEY en las variables de entorno');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analizá esta imagen de una factura o ticket de compra argentino.
Extraé los siguientes datos y devolvelos SOLO como JSON válido, sin markdown ni texto adicional:

{
  "cuitProveedor": "número de CUIT del emisor/vendedor (solo dígitos, 11 caracteres) o null",
  "nombreProveedor": "razón social o nombre del emisor/vendedor o null",
  "tipoComprobante": "A, B, C o X (X si no es factura formal) o null",
  "nroComprobante": "número de comprobante completo (ej: 0001-00001234) o null",
  "fecha": "fecha en formato YYYY-MM-DD o null",
  "montoTotal": número total o null,
  "netoGravado": importe neto gravado o null,
  "ivaDiscriminado": importe de IVA o null,
  "descripcion": "resumen breve de qué se compró (máx 100 chars) o null"
}

Reglas:
- Si un campo no se puede leer claramente, poné null
- El CUIT son 11 dígitos sin guiones
- Los montos son números sin signo de pesos
- Si ves "Factura A" o letra A grande, tipoComprobante es "A", igual para B y C
- Si es un ticket no fiscal, tipoComprobante es "X"
- Devolvé SOLO el JSON, nada más`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
  ]);

  const text = result.response.text().trim();

  // Limpiar posible markdown wrapping
  const jsonStr = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      cuitProveedor: parsed.cuitProveedor?.replace(/\D/g, '') || null,
      nombreProveedor: parsed.nombreProveedor || null,
      tipoComprobante: parsed.tipoComprobante || null,
      nroComprobante: parsed.nroComprobante || null,
      fecha: parsed.fecha || null,
      montoTotal: parsed.montoTotal != null ? Number(parsed.montoTotal) : null,
      netoGravado: parsed.netoGravado != null ? Number(parsed.netoGravado) : null,
      ivaDiscriminado: parsed.ivaDiscriminado != null ? Number(parsed.ivaDiscriminado) : null,
      descripcion: parsed.descripcion || null,
    };
  } catch {
    console.error('Error parseando respuesta de Gemini:', jsonStr);
    return {
      cuitProveedor: null,
      nombreProveedor: null,
      tipoComprobante: null,
      nroComprobante: null,
      fecha: null,
      montoTotal: null,
      netoGravado: null,
      ivaDiscriminado: null,
      descripcion: null,
    };
  }
}
