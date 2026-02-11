import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSessionUser();
  if (session) {
    redirect('/pos');
  }

  const params = await searchParams;

  const usuarios = await db.usuario.findMany({
    where: { deletedAt: null },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, rol: true },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-none pb-2">
          <h1 className="text-2xl font-black text-slate-800 mb-1">Ingreso MiniPOS</h1>
          <p className="text-sm text-slate-500">Seleccioná usuario y PIN para continuar.</p>
        </CardHeader>

        <CardContent>
          {params.error && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm border border-red-100">
              Usuario o PIN inválidos.
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Usuario</label>
              <Select name="userId" required className="mt-1">
                <option value="">Seleccionar usuario...</option>
                {usuarios.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">PIN</label>
              <Input
                name="pin"
                required
                type="password"
                inputMode="numeric"
                className="mt-1"
                placeholder="••••"
              />
            </div>

            <Button type="submit" className="w-full py-2.5">
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
