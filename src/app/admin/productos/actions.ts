'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from '@/lib/auth';

function parseMoney(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseStockBySucursal(formData: FormData, sucursalIds: string[]) {
  return sucursalIds
    .filter((sucursalId) => formData.get(`stockEnabled_${sucursalId}`) === 'on')
    .map((sucursalId) => {
      const cantidad = Number(formData.get(`stockQty_${sucursalId}`) ?? 0);
      return {
        sucursalId,
        cantidad: Number.isFinite(cantidad) && cantidad >= 0 ? cantidad : NaN,
      };
    });
}

async function getSucursalIds() {
  const sucursales = await db.sucursal.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  return sucursales.map((s: { id: string }) => s.id);
}

export async function crearProducto(formData: FormData) {
  await requireRole(['ADMIN']);

  const nombre = String(formData.get('nombre') || '').trim();
  const precioEfectivo = parseMoney(formData.get('precioEfectivo'));
  const precioDigital = parseMoney(formData.get('precioDigital'));
  const categoria = String(formData.get('categoria') || '').trim();
  const sucursalIds = await getSucursalIds();
  const stockEntries = parseStockBySucursal(formData, sucursalIds);

  if (
    !nombre ||
    !categoria ||
    !Number.isFinite(precioEfectivo) ||
    !Number.isFinite(precioDigital) ||
    precioEfectivo <= 0 ||
    precioDigital <= 0 ||
    stockEntries.some((entry) => !Number.isFinite(entry.cantidad))
  ) {
    throw new Error('Datos de producto inválidos');
  }

  await db.$transaction(async (tx: any) => {
    const producto = await tx.producto.create({
      data: {
        nombre,
        precioEfectivo,
        precioDigital,
        categoria,
      },
    });

    if (stockEntries.length > 0) {
      await tx.stockSucursal.createMany({
        data: stockEntries.map((entry) => ({
          productoId: producto.id,
          sucursalId: entry.sucursalId,
          cantidad: entry.cantidad,
          deletedAt: null,
        })),
      });
    }
  });

  revalidatePath('/admin/productos');
}

export async function actualizarProducto(formData: FormData) {
  await requireRole(['ADMIN']);

  const productoId = String(formData.get('productoId') || '');
  const nombre = String(formData.get('nombre') || '').trim();
  const categoria = String(formData.get('categoria') || '').trim();
  const precioEfectivo = parseMoney(formData.get('precioEfectivo'));
  const precioDigital = parseMoney(formData.get('precioDigital'));

  if (!productoId || !nombre || !categoria || !Number.isFinite(precioEfectivo) || !Number.isFinite(precioDigital) || precioEfectivo <= 0 || precioDigital <= 0) {
    throw new Error('Datos de actualización inválidos');
  }

  const sucursalIds = await getSucursalIds();
  const stockEntries = parseStockBySucursal(formData, sucursalIds);

  if (stockEntries.some((entry) => !Number.isFinite(entry.cantidad))) {
    throw new Error('Stock inválido para una o más sucursales');
  }

  const selectedIds = new Set(stockEntries.map((entry) => entry.sucursalId));
  const unselectedIds = sucursalIds.filter((id: string) => !selectedIds.has(id));

  await db.$transaction(async (tx: any) => {
    await tx.producto.update({
      where: { id: productoId },
      data: {
        nombre,
        categoria,
        precioEfectivo,
        precioDigital,
      },
    });

    if (unselectedIds.length > 0) {
      await tx.stockSucursal.deleteMany({
        where: {
          productoId,
          sucursalId: { in: unselectedIds },
        },
      });
    }

    for (const entry of stockEntries) {
      await tx.stockSucursal.upsert({
        where: {
          sucursalId_productoId: {
            sucursalId: entry.sucursalId,
            productoId,
          },
        },
        update: {
          cantidad: entry.cantidad,
          deletedAt: null,
        },
        create: {
          productoId,
          sucursalId: entry.sucursalId,
          cantidad: entry.cantidad,
          deletedAt: null,
        },
      });
    }
  });

  revalidatePath('/admin/productos');
}

export async function eliminarProducto(formData: FormData) {
  await requireRole(['ADMIN']);

  const productoId = String(formData.get('productoId') || '');
  if (!productoId) {
    throw new Error('Producto inválido');
  }

  await db.$transaction(async (tx: any) => {
    await tx.producto.update({
      where: { id: productoId },
      data: { deletedAt: new Date() },
    });

    await tx.stockSucursal.updateMany({
      where: { productoId },
      data: { deletedAt: new Date() },
    });
  });

  revalidatePath('/admin/productos');
}
