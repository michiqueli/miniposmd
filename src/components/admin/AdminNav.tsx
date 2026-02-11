import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

export default function AdminNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/ventas" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Ventas</Link>
        <Link href="/admin/productos" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Productos</Link>
        <Link href="/admin/deviceManager" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Terminales</Link>
        <Link href="/admin/usuarios" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Usuarios</Link>
        <Link href="/pos" className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 font-semibold text-blue-700">POS</Link>
      </div>
      <form action={logoutAction}>
        <button className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 font-semibold text-red-700 text-sm">Cerrar sesión</button>
      </form>
    </div>
  );
}
