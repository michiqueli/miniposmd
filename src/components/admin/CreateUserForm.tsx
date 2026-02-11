'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearUsuario } from '@/app/admin/usuarios/actions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/toast';

type SucursalListado = {
  id: string;
  nombre: string;
};

export default function CreateUserForm({ sucursales }: { sucursales: SucursalListado[] }) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const onSubmit = async (formData: FormData) => {
    setLoading(true);
    const res = await crearUsuario(formData);

    if (res.success) {
      showToast('Usuario creado correctamente.', 'success');
      router.refresh();
      return;
    }

    showToast(res.error || 'No se pudo crear el usuario.', 'error');
    setLoading(false);
  };

  return (
    <form action={onSubmit} className="grid md:grid-cols-4 gap-3 items-end">
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
          {sucursales.map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre}
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
      <Button type="submit" className="md:col-span-4" disabled={loading}>
        {loading ? 'Creando usuario...' : 'Crear usuario'}
      </Button>
    </form>
  );
}
