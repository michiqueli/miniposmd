// src/app/admin/contable/actions.ts
// ─────────────────────────────────────────────
// Server Actions para el módulo contable
// Libro IVA Ventas, Libro IVA Compras, Posición IVA
// ─────────────────────────────────────────────
'use server'

import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import type { FilaLibroIVAVentas, FilaLibroIVACompras, ResumenIVA } from '@/lib/types';

// ══════════════════════════════════════════════
// LIBRO IVA VENTAS
// ══════════════════════════════════════════════

export async function getLibroIVAVentas(
  mes: number,
  anio: number
): Promise<FilaLibroIVAVentas[]> {
  await requireRole(['ADMIN']);

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 0, 23, 59, 59);

  const ventas = await db.venta.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
      deletedAt: null,
      cae: { not: null },
    },
    include: { sucursal: true },
    orderBy: { nroFactura: 'asc' },
  });

  return ventas.map((v) => {
    const total = Number(v.total);
    const esRI = v.sucursal.regimen === 'RI';
    const neto = esRI ? +(total / 1.21).toFixed(2) : total;
    const iva = esRI ? +(total - neto).toFixed(2) : 0;

    return {
      fecha: v.fecha.toISOString().split('T')[0],
      tipoComprobante: `FC ${v.tipoFactura || 'B'}`,
      puntoVenta: String(v.sucursal.puntoVenta).padStart(5, '0'),
      nroComprobante: String(v.nroFactura).padStart(8, '0'),
      docReceptor: v.docReceptor || 'Cons. Final',
      denominacion: v.sucursal.nombre,
      netoGravado: neto,
      iva21: iva,
      total,
      cae: v.cae,
    };
  });
}

// ══════════════════════════════════════════════
// LIBRO IVA COMPRAS
// ══════════════════════════════════════════════

export async function getLibroIVACompras(
  mes: number,
  anio: number
): Promise<FilaLibroIVACompras[]> {
  await requireRole(['ADMIN']);

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 0, 23, 59, 59);

  const compras = await db.compra.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
      deletedAt: null,
    },
    orderBy: { fecha: 'asc' },
  });

  return compras.map((c) => {
    const monto = Number(c.monto);
    // Si hay datos fiscales explícitos, usarlos; sino estimar
    const netoGravado = c.netoGravado
      ? Number(c.netoGravado)
      : +(monto / 1.21).toFixed(2);
    const iva = c.ivaDiscriminado
      ? Number(c.ivaDiscriminado)
      : +(monto - netoGravado).toFixed(2);

    return {
      fecha: c.fecha.toISOString().split('T')[0],
      proveedor: c.nombreProveedor || c.descripcion,
      cuitProveedor: c.cuitProveedor || '-',
      tipoComprobante: c.tipoComprobante || '-',
      nroComprobante: c.nroComprobante || '-',
      netoGravado,
      // IMPORTANTE: Solo FC A da crédito fiscal
      iva21: c.tipoComprobante === 'A' ? iva : 0,
      total: monto,
    };
  });
}

// ══════════════════════════════════════════════
// RESUMEN / POSICIÓN IVA
// ══════════════════════════════════════════════

export async function getResumenIVA(mes: number, anio: number): Promise<ResumenIVA> {
  await requireRole(['ADMIN']);

  const [ventas, compras] = await Promise.all([
    getLibroIVAVentas(mes, anio),
    getLibroIVACompras(mes, anio),
  ]);

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
  const ivaDebitoFiscal = ventas.reduce((s, v) => s + v.iva21, 0);

  const totalCompras = compras.reduce((s, c) => s + c.total, 0);
  const ivaCreditoFiscal = compras.reduce((s, c) => s + c.iva21, 0);

  const posicionIVA = +(ivaDebitoFiscal - ivaCreditoFiscal).toFixed(2);

  let recomendacion: string;
  if (posicionIVA > 0) {
    recomendacion = `Debés $${posicionIVA.toFixed(2)} de IVA este mes. Para reducirlo podés: pedir más facturas A a proveedores, o facturar menos los últimos días del mes.`;
  } else if (posicionIVA < 0) {
    recomendacion = `Tenés $${Math.abs(posicionIVA).toFixed(2)} de saldo a favor. Podés facturar más tranquilo este mes.`;
  } else {
    recomendacion = 'IVA equilibrado este mes. Débito y crédito fiscal iguales.';
  }

  return {
    cantFacturas: ventas.length,
    totalVentas: +totalVentas.toFixed(2),
    ivaDebitoFiscal: +ivaDebitoFiscal.toFixed(2),
    cantCompras: compras.length,
    totalCompras: +totalCompras.toFixed(2),
    ivaCreditoFiscal: +ivaCreditoFiscal.toFixed(2),
    posicionIVA,
    debesPagar: posicionIVA > 0,
    recomendacion,
  };
}
