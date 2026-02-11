import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';

export default function PosTopBar({
  usuarioNombre,
  usuarioRole,
  sucursalId,
}: {
  usuarioNombre: string;
  usuarioRole: 'ADMIN' | 'CASHIER';
  sucursalId: string;
}) {
  return (
    <div className="fixed top-4 left-4 right-4 z-40 flex justify-between items-center rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
      <div>
        <p className="font-bold text-slate-700">{usuarioNombre}</p>
        <p className="text-xs text-slate-500">{usuarioRole} · Sucursal {sucursalId.slice(0, 8)}...</p>
      </div>
      <div className="flex items-center gap-2">
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
