import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <h1 className="text-2xl font-black text-slate-800 mb-1">Ingreso MiniPOS</h1>
        <p className="text-sm text-slate-500 mb-6">Seleccioná usuario y PIN para continuar.</p>

        {params.error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm border border-red-100">
            Usuario o PIN inválidos.
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Usuario</label>
            <select
              name="userId"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="">Seleccionar usuario...</option>
              {usuarios.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.rol === 'ADMIN' ? 'ADMIN' : 'CASHIER'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">PIN</label>
            <input
              name="pin"
              required
              type="password"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 text-white font-bold py-2.5 hover:bg-slate-800 transition-colors"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
