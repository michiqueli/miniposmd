// src/lib/mercadopago.ts
// ─────────────────────────────────────────────
// Helper centralizado para llamadas a la API de MercadoPago
// ─────────────────────────────────────────────

export function getMPToken() {
  const token = process.env.MP_ACCESS_TOKEN_PROD;
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN_PROD en las variables de entorno');
  return token;
}

/**
 * Fetch wrapper para la API de MercadoPago.
 * Agrega Authorization y Content-Type automáticamente.
 */
export async function mpFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getMPToken();
  return fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });
}
