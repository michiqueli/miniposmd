'use server'
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from '@/lib/auth';

export async function crearProducto(formData: FormData) {
  await requireRole(['ADMIN']);

  const nombre = String(formData.get('nombre') || '').trim();
  const precioEfectivo = Number(formData.get('precioEfectivo'));
  const precioDigital = Number(formData.get('precioDigital'));
  const categoria = String(formData.get('categoria') || '').trim();

  if (!nombre || !Number.isFinite(precioEfectivo) || !Number.isFinite(precioDigital) || precioEfectivo <= 0 || precioDigital <= 0) {
    throw new Error('Datos de producto inválidos');
  }

  await db.producto.create({
    data: {
      nombre,
      precioEfectivo,
      precioDigital,
      categoria,
    }
  });

  revalidatePath('/admin/productos');
}
