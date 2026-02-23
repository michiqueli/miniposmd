// src/lib/afip.ts
// ─────────────────────────────────────────────
// Integración real con AFIP usando @afipsdk/afip.js
//
// REQUISITOS:
//   npm install @afipsdk/afip.js
//
// VARIABLES DE ENTORNO:
//   AFIP_CUIT=20XXXXXXXX9
//   AFIP_CERT_PATH=certs/cert.crt
//   AFIP_KEY_PATH=certs/key.key
//   AFIP_PRODUCTION=true|false
//
// NOTA: Para testear, usá los certificados de homologación
// que se obtienen en https://www.afip.gob.ar/ws/
// ─────────────────────────────────────────────

import Afip from '@afipsdk/afip.js';

let instance: InstanceType<typeof Afip> | null = null;

export function getAfip(): InstanceType<typeof Afip> {
  if (!instance) {
    const cuit = process.env.AFIP_CUIT;
    if (!cuit) throw new Error('Falta AFIP_CUIT en variables de entorno');

    instance = new Afip({
      CUIT: cuit,
      cert: process.env.AFIP_CERT_PATH || 'certs/cert.crt',
      key: process.env.AFIP_KEY_PATH || 'certs/key.key',
      production: process.env.AFIP_PRODUCTION === 'true',
    });
  }
  return instance;
}

// ── Tipos de Comprobante AFIP ──
// 1  = Factura A
// 6  = Factura B
// 11 = Factura C (Monotributo)
// 3  = Nota de Crédito A
// 8  = Nota de Crédito B
// 13 = Nota de Crédito C

// ── Tipos de Documento ──
// 80 = CUIT
// 96 = DNI
// 99 = Consumidor Final (sin identificar)

// ── Alícuotas de IVA ──
// 3 = 0%
// 4 = 10.5%
// 5 = 21%
// 6 = 27%

export type DatosFacturaAFIP = {
  puntoVenta: number;
  tipoComprobante: number;
  concepto: number;        // 1=Productos, 2=Servicios, 3=Ambos
  docTipo: number;
  docNro: number;
  importeTotal: number;
  importeNeto: number;
  importeIVA: number;
  alicuotaIVA: number;     // ID de alícuota (5 = 21%)
};

export type ResultadoFactura = {
  cae: string;
  caeVencimiento: string;  // YYYYMMDD
  nroComprobante: number;
  puntoVenta: number;
};

export async function emitirFactura(datos: DatosFacturaAFIP): Promise<ResultadoFactura> {
  const afip = getAfip();

  // Obtener último número de comprobante emitido
  const ultimoComp = await afip.ElectronicBilling.getLastVoucher(
    datos.puntoVenta,
    datos.tipoComprobante
  );
  const nroComprobante = ultimoComp + 1;

  // Fecha en formato YYYYMMDD
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const facturaData: Record<string, unknown> = {
    CantReg: 1,
    PtoVta: datos.puntoVenta,
    CbteTipo: datos.tipoComprobante,
    Concepto: datos.concepto,
    DocTipo: datos.docTipo,
    DocNro: datos.docNro,
    CbteDesde: nroComprobante,
    CbteHasta: nroComprobante,
    CbteFch: hoy,
    ImpTotal: datos.importeTotal,
    ImpTotConc: 0,       // No gravado
    ImpNeto: datos.importeNeto,
    ImpOpEx: 0,           // Exento
    ImpIVA: datos.importeIVA,
    ImpTrib: 0,           // Otros tributos
    MonId: 'PES',         // Pesos argentinos
    MonCotiz: 1,
  };

  // Solo discriminar IVA en Factura A (tipo 1) y B (tipo 6) — Resp. Inscripto
  // Factura C (tipo 11) — Monotributo: NO lleva array de IVA
  if (datos.tipoComprobante === 1 || datos.tipoComprobante === 6) {
    facturaData.Iva = [
      {
        Id: datos.alicuotaIVA,
        BaseImp: datos.importeNeto,
        Importe: datos.importeIVA,
      },
    ];
  }

  const resultado = await afip.ElectronicBilling.createVoucher(facturaData);

  return {
    cae: resultado.CAE,
    caeVencimiento: resultado.CAEFchVto,
    nroComprobante,
    puntoVenta: datos.puntoVenta,
  };
}

/**
 * Consultar datos de un comprobante ya emitido (para reimpresión).
 */
export async function consultarComprobante(
  puntoVenta: number,
  tipoComprobante: number,
  nroComprobante: number
) {
  const afip = getAfip();
  return afip.ElectronicBilling.getVoucherInfo(nroComprobante, puntoVenta, tipoComprobante);
}
