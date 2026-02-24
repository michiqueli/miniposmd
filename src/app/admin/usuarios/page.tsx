import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import UsersTable from '@/components/admin/UsersTable';
import CreateUserForm from '@/components/admin/CreateUserForm';

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
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Usuarios</h1>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold text-slate-700">Crear usuario</h2>
          <p className="text-xs text-slate-500 mt-1">PIN numérico de 4 a 8 dígitos.</p>
        </CardHeader>
        <CardContent>
          <CreateUserForm sucursales={sucursales} />
        </CardContent>
      </Card>

      <UsersTable usuarios={usuariosTabla} sucursalOptions={sucursalFilterOptions} />
    </div>
  );
}
