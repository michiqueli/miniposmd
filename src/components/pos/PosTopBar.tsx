'use client';

import Link from 'next/link';
import { LogOut, ShoppingBag } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';

export default function PosTopBar({
  usuarioNombre,
  usuarioRole,
  sucursalNombre,
  onCargarCompra,
}: {
  usuarioNombre: string;
  usuarioRole: 'ADMIN' | 'CASHIER';
  sucursalNombre: string;
  onCargarCompra?: () => void;
}) {
  return (
    <div className="fixed top-2 left-2 right-2 z-40 flex justify-between items-center rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
      <div>
        <p className="font-bold text-slate-700">{usuarioNombre}</p>
        <p className="text-xs text-slate-500">{usuarioRole} · {sucursalNombre}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCargarCompra}
          className="text-sm px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 font-semibold text-orange-700 flex items-center gap-1 transition-colors"
        >
          <ShoppingBag size={14} /> Cargar Compra
        </button>
        {usuarioRole === 'ADMIN' && (
          <Link href="/admin/ventas" className="text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">
            Ir a Admin
          </Link>
        )}
        <form action={logoutAction}>
          <Button variant="danger" className="flex items-center gap-1 text-sm">
            <LogOut size={14} /> Salir
          </Button>
        </form>
      </div>
    </div>
  );
}
