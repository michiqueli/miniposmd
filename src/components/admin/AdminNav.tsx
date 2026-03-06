// src/components/admin/AdminNav.tsx
// ─────────────────────────────────────────────
// Navegación del panel de admin (ahora incluye "Contable")
// ─────────────────────────────────────────────

import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';

const links = [
  { href: '/admin/ventas', label: 'Ventas' },
  { href: '/admin/compras', label: 'Compras' },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/sucursales', label: 'Sucursales' },
  { href: '/admin/dispositivos', label: 'Terminales' },
  { href: '/admin/contable', label: 'Contable' },
  { href: '/pos', label: 'POS', pos: true },
];

export default function AdminNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-1.5 font-semibold transition-colors ${
              link.pos
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <form action={logoutAction}>
        <Button variant="danger" className="text-sm">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
