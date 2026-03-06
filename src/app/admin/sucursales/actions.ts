'use server';

import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function crearSucursal(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireRole(['ADMIN']);

  const nombre = String(formData.get('nombre') || '').trim();
  const direccion = String(formData.get('direccion') || '').trim();
  const cuit = String(formData.get('cuit') || '').trim();
  const regimen = String(formData.get('regimen') || '').trim();
  const puntoVenta = Number(formData.get('puntoVenta') || 0);
  const razonSocial = String(formData.get('razonSocial') || '').trim() || null;
  const ingresosBrutos = String(formData.get('ingresosBrutos') || '').trim() || null;
  const inicioActividades = String(formData.get('inicioActividades') || '').trim() || null;

  if (!nombre || !direccion || !cuit || !['RI', 'MONO'].includes(regimen) || puntoVenta < 1) {
    return { success: false, error: 'Datos inválidos. Verificá nombre, dirección, CUIT, régimen y punto de venta.' };
  }

  try {
    await db.sucursal.create({
      data: { nombre, direccion, cuit, regimen, puntoVenta, razonSocial, ingresosBrutos, inicioActividades },
    });
    revalidatePath('/admin/sucursales');
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo crear la sucursal. Intentá nuevamente.' };
  }
}

export async function actualizarSucursal(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireRole(['ADMIN']);

  const id = String(formData.get('id') || '').trim();
  const nombre = String(formData.get('nombre') || '').trim();
  const direccion = String(formData.get('direccion') || '').trim();
  const cuit = String(formData.get('cuit') || '').trim();
  const regimen = String(formData.get('regimen') || '').trim();
  const puntoVenta = Number(formData.get('puntoVenta') || 0);
  const razonSocial = String(formData.get('razonSocial') || '').trim() || null;
  const ingresosBrutos = String(formData.get('ingresosBrutos') || '').trim() || null;
  const inicioActividades = String(formData.get('inicioActividades') || '').trim() || null;
  const mpDeviceId = String(formData.get('mpDeviceId') || '').trim() || null;

  if (!id || !nombre || !direccion || !cuit || !['RI', 'MONO'].includes(regimen) || puntoVenta < 1) {
    return { success: false, error: 'Datos inválidos. Verificá todos los campos obligatorios.' };
  }

  try {
    await db.sucursal.update({
      where: { id },
      data: { nombre, direccion, cuit, regimen, puntoVenta, razonSocial, ingresosBrutos, inicioActividades, mpDeviceId },
    });
    revalidatePath('/admin/sucursales');
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo actualizar la sucursal.' };
  }
}

export async function eliminarSucursal(id: string): Promise<{ success: boolean; error?: string }> {
  await requireRole(['ADMIN']);

  try {
    // Check for active users or recent sales
    const activeUsers = await db.usuario.count({ where: { sucursalId: id, deletedAt: null } });
    if (activeUsers > 0) {
      return { success: false, error: `No se puede eliminar: tiene ${activeUsers} usuario(s) activo(s). Desactivalos primero.` };
    }

    await db.sucursal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    revalidatePath('/admin/sucursales');
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo eliminar la sucursal.' };
  }
}
