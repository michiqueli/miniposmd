import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import { crearUsuario } from './actions';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import UsersTable from '@/components/admin/UsersTable';

type UsuarioListado = {
  id: string;
  nombre: string;
  rol: string;
  sucursal: { nombre: string };
};

type SucursalListado = {
  id: string;
  nombre: string;
};

export default async function AdminUsuariosPage() {
  await requireRole(['ADMIN']);

  const [usuarios, sucursales]: [UsuarioListado[], SucursalListado[]] = await Promise.all([
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

  const usuariosTabla = usuarios.map((usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    sucursalNombre: usuario.sucursal.nombre,
  }));

  const sucursalFilterOptions = [
    { label: 'Todas las sucursales', value: 'ALL' },
    ...sucursales.map((sucursal) => ({ label: sucursal.nombre, value: sucursal.nombre })),
  ];

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
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
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
            <Button type="submit" className="md:col-span-4">
              Crear usuario
            </Button>
          </form>
        </CardContent>
      </Card>

      <UsersTable usuarios={usuariosTabla} sucursalOptions={sucursalFilterOptions} />
    </div>
  );
}
