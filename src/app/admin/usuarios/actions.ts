'use server';

import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function crearUsuario(formData: FormData) {
  await requireRole(['ADMIN']);

  const nombre = String(formData.get('nombre') || '').trim();
  const pin = String(formData.get('pin') || '').trim();
  const sucursalId = String(formData.get('sucursalId') || '').trim();
  const rol = String(formData.get('rol') || '').trim();

  if (!nombre || !pin || !sucursalId || !['ADMIN', 'CASHIER'].includes(rol)) {
    throw new Error('Datos inválidos para crear usuario');
  }

  await db.usuario.create({
    data: {
      nombre,
      pin,
      sucursalId,
      rol,
    },
  });

  revalidatePath('/admin/usuarios');
}

export async function actualizarRolUsuario(userId: string, rol: string) {
  await requireRole(['ADMIN']);

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
