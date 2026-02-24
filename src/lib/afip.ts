// src/lib/afip.ts
import { Arca } from "@arcasdk/core";
import fs from "fs";
import path from "path";

let instance: Arca | null = null;

export function getAfip(): Arca {
  if (!instance) {
    const cuitStr = process.env.AFIP_CUIT;
    if (!cuitStr) throw new Error("Falta AFIP_CUIT");

    const cuit = Number(cuitStr.replace(/\D/g, ""));
    if (!Number.isFinite(cuit)) throw new Error("AFIP_CUIT inválido");

    const certPath = process.env.AFIP_CERT_PATH || "certs/cert.crt";
    const keyPath = process.env.AFIP_KEY_PATH || "certs/key.key";

    // Arca SDK permite pasar contenido o path. Acá usamos contenido (como vos ya lo tenías).
    const cert = fs.readFileSync(path.resolve(certPath), "utf8");
    const key = fs.readFileSync(path.resolve(keyPath), "utf8");

    instance = new Arca({
      cuit,
      cert,
      key,
      production: true
    });
  }
  return instance;
}

export type DatosFacturaAFIP = {
  puntoVenta: number;
  tipoComprobante: number;
  concepto: number; // 1=Productos, 2=Servicios, 3=Ambos
  docTipo: number;
  docNro: number;
  importeTotal: number;
  importeNeto: number;
  importeIVA: number;
  alicuotaIVA: number; // (5 = 21%)
};

export type ResultadoFactura = {
  cae: string;
  caeVencimiento: string; // YYYYMMDD
  nroComprobante: number;
  puntoVenta: number;
};

type PayloadReceptor = {
  receptorId: string;     // "0" o CUIT/CUIL
  tipo: "A" | "B" | "C";
  tipoReceptor: "CUIL" | "CF";
};

function mapReceptorAFIP(p: PayloadReceptor): {
  DocTipo: number;
  DocNro: number;
  CondicionIVAReceptorId: number;
} {
  // CF puro
  if (p.tipo === "B" && p.tipoReceptor === "CF") {
    return { DocTipo: 99, DocNro: 0, CondicionIVAReceptorId: 5 };
  }

  // Factura A => RI (siempre identificado)
  if (p.tipo === "A") {
    return { DocTipo: 80, DocNro: Number(p.receptorId), CondicionIVAReceptorId: 1 };
  }

  // Factura B con receptor identificado (CUIL/CUIT)
  // Default práctico: "consumidor final identificado"
  if (p.tipo === "B" && p.tipoReceptor === "CUIL") {
    return { DocTipo: 80, DocNro: Number(p.receptorId), CondicionIVAReceptorId: 5 };
  }

  // fallback
  return { DocTipo: 99, DocNro: 0, CondicionIVAReceptorId: 5 };
}

export async function emitirFactura(
  datos: DatosFacturaAFIP
): Promise<ResultadoFactura> {
  console.log("entrando a emitirFactura");
  const arca = getAfip();
  console.log(datos);

  try {
    console.log("Intentando obtener último voucher...");
    const ultimoComp = await arca.electronicBillingService.getLastVoucher(
      datos.puntoVenta,
      datos.tipoComprobante
    );
    console.log("✅ Último comprobante:", ultimoComp);

    const nroComprobante = Number(ultimoComp.cbteNro) + 1;

    const hoy = new Date().toISOString().split("T")[0].replace(/-/g, "");

    const receptor = mapReceptorAFIP({
      receptorId: String(datos.docNro), // o desde tu payload real
      tipo: datos.tipoComprobante === 1 ? "A" : "B", // o mejor: pasalo directo
      tipoReceptor: datos.docTipo === 99 ? "CF" : "CUIL",
    });

    const facturaData = {
      CantReg: 1,
      PtoVta: datos.puntoVenta,
      CbteTipo: datos.tipoComprobante,
      Concepto: datos.concepto,
      DocTipo: receptor.DocTipo,
      DocNro: receptor.DocNro,
      CondicionIVAReceptorId: receptor.CondicionIVAReceptorId,
      CbteDesde: nroComprobante,
      CbteHasta: nroComprobante,
      CbteFch: hoy,
      ImpTotal: datos.importeTotal,
      ImpTotConc: 0,
      ImpNeto: datos.importeNeto,
      ImpOpEx: 0,
      ImpIVA: datos.importeIVA,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      ...(datos.tipoComprobante === 1 || datos.tipoComprobante === 6
        ? {
          Iva: [
            {
              Id: datos.alicuotaIVA,
              BaseImp: datos.importeNeto,
              Importe: datos.importeIVA,
            },
          ],
        }
        : {}),
    };

    console.log(facturaData);

    const resultado = await arca.electronicBillingService.createVoucher(
      facturaData
    );

    console.log(resultado);

    return {
      cae: resultado.cae,
      caeVencimiento: resultado.caeFchVto,
      nroComprobante,
      puntoVenta: datos.puntoVenta,
    };
  } catch (error: any) {
    const data = error?.response?.data ?? error?.data ?? null;

    console.error("❌ Error status:", error?.response?.status ?? error?.status);
    console.error("❌ Error message:", error?.message);

    if (data) console.error("📦 Error data:", JSON.stringify(data, null, 2));
    else console.error("📦 Error raw:", error);

    throw error;
  }
}

export async function consultarComprobante(
  puntoVenta: number,
  tipoComprobante: number,
  nroComprobante: number
) {
  const arca = getAfip();
  // Firma según doc: getVoucherInfo(nro, ptoVta, cbteTipo)
  return arca.electronicBillingService.getVoucherInfo(
    nroComprobante,
    puntoVenta,
    tipoComprobante
  );
}