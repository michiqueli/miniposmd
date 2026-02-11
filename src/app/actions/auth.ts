'use server';

import { redirect } from 'next/navigation';
import { clearSession, createSessionForUser } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  const userId = String(formData.get('userId') || '').trim();
  const pin = String(formData.get('pin') || '').trim();

  if (!userId || !pin) {
    redirect('/login?error=1');
  }

  const res = await createSessionForUser(userId, pin);
  if (!res.ok) {
    redirect('/login?error=1');
  }

  redirect('/pos');
}

export async function logoutAction() {
  await clearSession();
  redirect('/login');
}
