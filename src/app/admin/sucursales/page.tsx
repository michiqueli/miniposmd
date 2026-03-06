import { db } from '@/lib/db';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import SucursalesTable from './components/SucursalesTable';
import CreateSucursalForm from './components/CreateSucursalForm';

export default async function AdminSucursalesPage() {
  const sucursales = await db.sucursal.findMany({
    where: { deletedAt: null },
    orderBy: { nombre: 'asc' },
    include: {
      _count: { select: { usuarios: { where: { deletedAt: null } }, ventas: true } },
    },
  });

  const sucursalesData = sucursales.map((s: any) => ({
    id: s.id,
    nombre: s.nombre,
    direccion: s.direccion,
    cuit: s.cuit,
    regimen: s.regimen,
    puntoVenta: s.puntoVenta,
    razonSocial: s.razonSocial,
    ingresosBrutos: s.ingresosBrutos,
    inicioActividades: s.inicioActividades,
    mpDeviceId: s.mpDeviceId,
    cantUsuarios: s._count.usuarios,
    cantVentas: s._count.ventas,
  }));

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Sucursales</h1>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold text-slate-700">Crear sucursal</h2>
          <p className="text-xs text-slate-500 mt-1">Completá los datos obligatorios (*) para dar de alta una nueva sucursal.</p>
        </CardHeader>
        <CardContent>
          <CreateSucursalForm />
        </CardContent>
      </Card>

      <SucursalesTable sucursales={sucursalesData} />
    </>
  );
}
