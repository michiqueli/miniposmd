'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearSucursal } from '../actions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/toast';

export default function CreateSucursalForm() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const onSubmit = async (formData: FormData) => {
    setLoading(true);
    const res = await crearSucursal(formData);
    if (res.success) {
      showToast('Sucursal creada correctamente.', 'success');
      router.refresh();
    } else {
      showToast(res.error || 'No se pudo crear la sucursal.', 'error');
    }
    setLoading(false);
  };

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Nombre comercial *</label>
          <Input name="nombre" required placeholder="Ej: EcoParrilla Central" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Dirección *</label>
          <Input name="direccion" required placeholder="Ej: Av San Martín 556" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">CUIT *</label>
          <Input name="cuit" required placeholder="Ej: 20295544040" className="mt-1" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Régimen *</label>
          <Select name="regimen" required className="mt-1">
            <option value="">Seleccionar...</option>
            <option value="RI">Responsable Inscripto</option>
            <option value="MONO">Monotributista</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Punto de venta *</label>
          <Input name="puntoVenta" type="number" min={1} required placeholder="Ej: 3" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Razón social</label>
          <Input name="razonSocial" placeholder="Ej: MENNICHELLI NICOLAS GUSTAVO" className="mt-1" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Ingresos Brutos (Nro IIBB)</label>
          <Input name="ingresosBrutos" placeholder="Suele ser igual al CUIT" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Fecha inicio actividades</label>
          <Input name="inicioActividades" placeholder="Ej: 01/03/2015" className="mt-1" />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creando sucursal...' : 'Crear sucursal'}
      </Button>
    </form>
  );
}
