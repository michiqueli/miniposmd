import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import { actualizarRolUsuario, crearUsuario, desactivarUsuario } from './actions';

export default async function AdminUsuariosPage() {
  await requireRole(['ADMIN']);

  const [usuarios, sucursales] = await Promise.all([
    db.usuario.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
      include: { sucursal: { select: { nombre: true } } },
    }),
    db.sucursal.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <div className="p-8 min-h-screen bg-slate-50">
      <AdminNav />
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Usuarios</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="font-bold text-slate-700 mb-3">Crear usuario</h2>
        <form action={crearUsuario} className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-500">Nombre</label>
            <input name="nombre" required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">PIN</label>
            <input name="pin" required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Sucursal</label>
            <select name="sucursalId" required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
              <option value="">Seleccionar...</option>
              {sucursales.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Rol</label>
            <select name="rol" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
              <option value="CASHIER">CASHIER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <button type="submit" className="md:col-span-4 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold">
            Crear usuario
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Sucursal</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u: any) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-800">{u.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{u.sucursal.nombre}</td>
                <td className="px-4 py-3">
                  <form action={async (formData) => {
                    'use server';
                    const role = String(formData.get('rol') || 'CASHIER');
                    await actualizarRolUsuario(u.id, role);
                  }}>
                    <select name="rol" defaultValue={u.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'} className="border border-slate-300 rounded px-2 py-1 bg-white">
                      <option value="CASHIER">CASHIER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button className="ml-2 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold">Guardar</button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={async () => {
                    'use server';
                    await desactivarUsuario(u.id);
                  }}>
                    <button className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 font-semibold">Desactivar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
