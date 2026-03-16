import { db } from '@/lib/db';
import PosShell from './components/PosShell';
import { requireRole } from '@/lib/auth';

export default async function PosPage() {
  const user = await requireRole(['ADMIN', 'CASHIER']);

  const [productosRaw, sucursal] = await Promise.all([
    db.producto.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
    }),
    db.sucursal.findUnique({
      where: { id: user.sucursalId },
      select: { nombre: true },
    }),
  ]);

  const productos = productosRaw.map((p: any) => ({
    ...p,
    precioEfectivo: Number(p.precioEfectivo),
    precioDigital: Number(p.precioDigital),
  }));

  return <PosShell productos={productos} sucursalId={user.sucursalId} sucursalNombre={sucursal?.nombre ?? ''} usuarioId={user.userId} usuarioNombre={user.nombre} usuarioRole={user.role} />;
}
