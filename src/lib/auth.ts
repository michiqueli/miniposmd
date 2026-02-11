import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { hashPin, verifyPin } from '@/lib/security';

export type AppRole = 'ADMIN' | 'CASHIER';

export type SessionUser = {
  userId: string;
  nombre: string;
  role: AppRole;
  sucursalId: string;
};

const SESSION_COOKIE = 'minipos_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET es obligatorio en producción');
  }
  return secret || 'local-dev-secret';
}

function normalizeRole(role: string): AppRole {
  if (role === 'ADMIN') return 'ADMIN';
  return 'CASHIER';
}

function sign(payloadBase64: string) {
  return createHmac('sha256', getSessionSecret()).update(payloadBase64).digest('base64url');
}

function encodeSession(payload: SessionUser) {
  const fullPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function decodeSession(token: string): SessionUser | null {
  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = sign(payloadBase64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as SessionUser & { exp: number };
    if (!parsed.exp || parsed.exp < Date.now()) return null;

    return {
      userId: parsed.userId,
      nombre: parsed.nombre,
      role: normalizeRole(parsed.role as string),
      sucursalId: parsed.sucursalId,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function createSessionForUser(userId: string, plainPin: string) {
  const user = await db.usuario.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      nombre: true,
      pin: true,
      rol: true,
      sucursalId: true,
    },
  });

  if (!user || !verifyPin(plainPin, user.pin)) {
    return { ok: false as const, error: 'Credenciales inválidas' };
  }

  if (!user.pin.startsWith('scrypt$')) {
    await db.usuario.update({
      where: { id: user.id },
      data: { pin: hashPin(plainPin) },
    });
  }

  const sessionToken = encodeSession({
    userId: user.id,
    nombre: user.nombre,
    role: normalizeRole(user.rol),
    sucursalId: user.sucursalId,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });

  return { ok: true as const };
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect('/pos');
  }
  return user;
}
