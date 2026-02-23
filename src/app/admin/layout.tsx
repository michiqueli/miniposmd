// src/app/admin/layout.tsx
// ─────────────────────────────────────────────
// Layout compartido para todas las páginas de admin.
// Incluye AdminNav y requiere rol ADMIN una sola vez.
// Antes, cada page repetía <AdminNav /> y await requireRole(['ADMIN']).
// ─────────────────────────────────────────────

import AdminNav from '@/components/admin/AdminNav';
import { requireRole } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['ADMIN']);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <AdminNav />
      {children}
    </div>
  );
}
