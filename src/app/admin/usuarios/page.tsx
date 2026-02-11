import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import { actualizarRolUsuario, crearUsuario, desactivarUsuario } from './actions';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

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

      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold text-slate-700">Crear usuario</h2>
          <p className="text-xs text-slate-500 mt-1">PIN numérico de 4 a 8 dígitos.</p>
        </CardHeader>
        <CardContent>
          <form action={crearUsuario} className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-500">Nombre</label>
              <Input name="nombre" required className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">PIN</label>
              <Input name="pin" required inputMode="numeric" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Sucursal</label>
              <Select name="sucursalId" required className="mt-1">
                <option value="">Seleccionar...</option>
                {sucursales.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Rol</label>
              <Select name="rol" className="mt-1">
                <option value="CASHIER">CASHIER</option>
                <option value="ADMIN">ADMIN</option>
              </Select>
            </div>
            <Button type="submit" className="md:col-span-4">Crear usuario</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-hidden">
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
                    <form action={actualizarRolUsuario.bind(null, u.id)} className="flex items-center gap-2">
                      <Select name="rol" defaultValue={u.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'} className="max-w-[140px]">
                        <option value="CASHIER">CASHIER</option>
                        <option value="ADMIN">ADMIN</option>
                      </Select>
                      <Button variant="secondary" className="text-xs">Guardar</Button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant={u.rol === 'ADMIN' ? 'info' : 'neutral'}>{u.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'}</Badge>
                      <form action={desactivarUsuario.bind(null, u.id)}>
                        <Button variant="danger" className="text-xs">Desactivar</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
