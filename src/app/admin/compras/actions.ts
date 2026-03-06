'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { uploadFile, getFileUrl } from '@/lib/minio';
import { extraerDatosFactura } from '@/lib/ocr-factura';

// ══════════════════════════════════════════════
// CATEGORÍAS FIJAS
// ══════════════════════════════════════════════

export const CATEGORIAS_COMPRA = [
  'Mercadería',
  'Servicios',
  'Insumos',
  'Alquiler',
  'Impuestos',
  'Sueldos',
] as const;

export type CategoriaCompra = (typeof CATEGORIAS_COMPRA)[number];

// ══════════════════════════════════════════════
// LISTAR COMPRAS
// ══════════════════════════════════════════════

export async function listarCompras() {
  const user = await requireRole(['ADMIN']);

  const compras = await db.compra.findMany({
    where: {
      sucursalId: user.sucursalId,
      deletedAt: null,
    },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
  });

  return compras.map((c) => ({
    id: c.id,
    numeroCompra: c.numeroCompra,
    fecha: c.fecha.toISOString(),
    descripcion: c.descripcion,
    monto: Number(c.monto),
    categoria: c.categoria,
    metodoPago: c.metodoPago,
    cuitProveedor: c.cuitProveedor,
    nombreProveedor: c.nombreProveedor,
    tipoComprobante: c.tipoComprobante,
    nroComprobante: c.nroComprobante,
    netoGravado: c.netoGravado ? Number(c.netoGravado) : null,
    ivaDiscriminado: c.ivaDiscriminado ? Number(c.ivaDiscriminado) : null,
    fotoTicketKey: c.fotoTicketKey,
    usuario: c.usuario?.nombre || null,
  }));
}

export type CompraListItem = Awaited<ReturnType<typeof listarCompras>>[number];

// ══════════════════════════════════════════════
// CREAR COMPRA
// ══════════════════════════════════════════════

export async function crearCompra(data: {
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: string;
  metodoPago: string;
  cuitProveedor?: string;
  nombreProveedor?: string;
  tipoComprobante?: string;
  nroComprobante?: string;
  netoGravado?: number;
  ivaDiscriminado?: number;
  fotoBase64?: string;
  fotoMimeType?: string;
  fotoFileName?: string;
}) {
  try {
    const user = await requireRole(['ADMIN', 'CASHIER']);

    let fotoTicketKey: string | null = null;
    if (data.fotoBase64 && data.fotoMimeType && data.fotoFileName) {
      const buffer = Buffer.from(data.fotoBase64, 'base64');
      fotoTicketKey = await uploadFile(buffer, data.fotoFileName, data.fotoMimeType);
    }

    const compra = await db.compra.create({
      data: {
        fecha: new Date(data.fecha),
        descripcion: data.descripcion,
        monto: data.monto,
        categoria: data.categoria,
        metodoPago: data.metodoPago || null,
        cuitProveedor: data.cuitProveedor || null,
        nombreProveedor: data.nombreProveedor || null,
        tipoComprobante: data.tipoComprobante || null,
        nroComprobante: data.nroComprobante || null,
        netoGravado: data.netoGravado ?? null,
        ivaDiscriminado: data.ivaDiscriminado ?? null,
        fotoTicketKey,
        sucursalId: user.sucursalId,
        usuarioId: user.userId,
      },
    });

    revalidatePath('/admin/compras');
    revalidatePath('/admin/contable');
    return { success: true, compraId: compra.id };
  } catch (error) {
    console.error('Error creando compra:', error);
    return { success: false, error: 'Error al guardar la compra' };
  }
}

// ══════════════════════════════════════════════
// ACTUALIZAR COMPRA
// ══════════════════════════════════════════════

export async function actualizarCompra(
  compraId: string,
  data: {
    fecha?: string;
    descripcion?: string;
    monto?: number;
    categoria?: string;
    metodoPago?: string;
    cuitProveedor?: string;
    nombreProveedor?: string;
    tipoComprobante?: string;
    nroComprobante?: string;
    netoGravado?: number | null;
    ivaDiscriminado?: number | null;
  }
) {
  try {
    await requireRole(['ADMIN']);

    await db.compra.update({
      where: { id: compraId },
      data: {
        ...(data.fecha && { fecha: new Date(data.fecha) }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.monto !== undefined && { monto: data.monto }),
        ...(data.categoria !== undefined && { categoria: data.categoria }),
        ...(data.metodoPago !== undefined && { metodoPago: data.metodoPago }),
        ...(data.cuitProveedor !== undefined && { cuitProveedor: data.cuitProveedor || null }),
        ...(data.nombreProveedor !== undefined && { nombreProveedor: data.nombreProveedor || null }),
        ...(data.tipoComprobante !== undefined && { tipoComprobante: data.tipoComprobante || null }),
        ...(data.nroComprobante !== undefined && { nroComprobante: data.nroComprobante || null }),
        ...(data.netoGravado !== undefined && { netoGravado: data.netoGravado }),
        ...(data.ivaDiscriminado !== undefined && { ivaDiscriminado: data.ivaDiscriminado }),
      },
    });

    revalidatePath('/admin/compras');
    revalidatePath('/admin/contable');
    return { success: true };
  } catch (error) {
    console.error('Error actualizando compra:', error);
    return { success: false, error: 'Error al actualizar' };
  }
}

// ══════════════════════════════════════════════
// ELIMINAR COMPRA (soft delete)
// ══════════════════════════════════════════════

export async function eliminarCompra(compraId: string) {
  try {
    await requireRole(['ADMIN']);

    await db.compra.update({
      where: { id: compraId },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/admin/compras');
    revalidatePath('/admin/contable');
    return { success: true };
  } catch (error) {
    console.error('Error eliminando compra:', error);
    return { success: false, error: 'Error al eliminar' };
  }
}

// ══════════════════════════════════════════════
// OBTENER URL DE FOTO
// ══════════════════════════════════════════════

export async function obtenerUrlFoto(key: string) {
  try {
    await requireRole(['ADMIN', 'CASHIER']);
    const url = await getFileUrl(key);
    return { success: true, url };
  } catch (error) {
    console.error('Error obteniendo URL:', error);
    return { success: false, error: 'Error al obtener la imagen' };
  }
}

// ══════════════════════════════════════════════
// PROCESAR IMAGEN CON IA (Gemini Vision)
// ══════════════════════════════════════════════

export async function procesarImagenFactura(base64: string, mimeType: string) {
  try {
    await requireRole(['ADMIN', 'CASHIER']);
    const datos = await extraerDatosFactura(base64, mimeType);
    return { success: true, datos };
  } catch (error) {
    console.error('Error procesando imagen:', error);
    return { success: false, error: 'Error al procesar la imagen' };
  }
}
