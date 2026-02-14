'use server';

import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { hashPin, isStrongPin } from '@/lib/security';

export async function crearUsuario(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireRole(['ADMIN']);

  const nombre = String(formData.get('nombre') || '').trim();
  const pin = String(formData.get('pin') || '').trim();
  const sucursalId = String(formData.get('sucursalId') || '').trim();
  const rol = String(formData.get('rol') || '').trim();

  if (nombre.length < 3 || !isStrongPin(pin) || !sucursalId || !['ADMIN', 'CASHIER'].includes(rol)) {
    return { success: false, error: 'Datos inválidos para crear usuario. El PIN debe ser numérico de 4 a 8 dígitos.' };
  }

  try {
    await db.usuario.create({
      data: {
        nombre,
        pin: hashPin(pin),
        sucursalId,
        rol,
      },
    });

    revalidatePath('/admin/usuarios');
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo crear el usuario. Intentá nuevamente.' };
  }
}

export async function actualizarRolUsuario(userId: string, formData: FormData) {
  await requireRole(['ADMIN']);

  const rol = String(formData.get('rol') || '').trim();
  if (!['ADMIN', 'CASHIER'].includes(rol)) {
    throw new Error('Rol inválido');
  }

  await db.usuario.update({
    where: { id: userId },
    data: { rol },
  });

  revalidatePath('/admin/usuarios');
}

export async function desactivarUsuario(userId: string) {
  await requireRole(['ADMIN']);

  await db.usuario.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/admin/usuarios');
}
