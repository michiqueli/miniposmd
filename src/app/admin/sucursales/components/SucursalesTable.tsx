'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { actualizarSucursal, eliminarSucursal } from '../actions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/toast';

type SucursalRow = {
  id: string;
  nombre: string;
  direccion: string;
  cuit: string;
  regimen: string;
  puntoVenta: number;
  razonSocial: string | null;
  ingresosBrutos: string | null;
  inicioActividades: string | null;
  mpDeviceId: string | null;
  cantUsuarios: number;
  cantVentas: number;
};

export default function SucursalesTable({ sucursales }: { sucursales: SucursalRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (formData: FormData) => {
    setLoading(true);
    const res = await actualizarSucursal(formData);
    if (res.success) {
      showToast('Sucursal actualizada.', 'success');
      setEditingId(null);
      router.refresh();
    } else {
      showToast(res.error || 'Error al actualizar.', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    const res = await eliminarSucursal(deletingId);
    if (res.success) {
      showToast('Sucursal eliminada.', 'success');
      setDeletingId(null);
      router.refresh();
    } else {
      showToast(res.error || 'Error al eliminar.', 'error');
    }
    setLoading(false);
  };

  return (
    <>
      <div className="space-y-4">
        {sucursales.length === 0 && (
          <div className="text-center py-12 text-slate-500">No hay sucursales cargadas.</div>
        )}

        {sucursales.map((s) => {
          const isEditing = editingId === s.id;

          if (isEditing) {
            return (
              <form key={s.id} action={handleSave} className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-5 shadow-sm space-y-4">
                <input type="hidden" name="id" value={s.id} />
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-blue-800">Editando: {s.nombre}</h3>
                  <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-700">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Nombre comercial *</label>
                    <Input name="nombre" required defaultValue={s.nombre} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Dirección *</label>
                    <Input name="direccion" required defaultValue={s.direccion} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">CUIT *</label>
                    <Input name="cuit" required defaultValue={s.cuit} className="mt-1" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Régimen *</label>
                    <Select name="regimen" required defaultValue={s.regimen} className="mt-1">
                      <option value="RI">Responsable Inscripto</option>
                      <option value="MONO">Monotributista</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Punto de venta *</label>
                    <Input name="puntoVenta" type="number" min={1} required defaultValue={s.puntoVenta} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Razón social</label>
                    <Input name="razonSocial" defaultValue={s.razonSocial ?? ''} className="mt-1" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Ingresos Brutos (Nro IIBB)</label>
                    <Input name="ingresosBrutos" defaultValue={s.ingresosBrutos ?? ''} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Fecha inicio actividades</label>
                    <Input name="inicioActividades" defaultValue={s.inicioActividades ?? ''} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Device ID MercadoPago</label>
                    <Input name="mpDeviceId" defaultValue={s.mpDeviceId ?? ''} className="mt-1" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    <Save size={14} className="mr-1" />
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            );
          }

          return (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-800">{s.nombre}</h3>
                    <Badge variant={s.regimen === 'RI' ? 'info' : 'neutral'}>
                      {s.regimen === 'RI' ? 'Resp. Inscripto' : 'Monotributo'}
                    </Badge>
                    <Badge variant="neutral">PV {String(s.puntoVenta).padStart(5, '0')}</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 text-sm text-slate-600">
                    <div><strong className="text-slate-500">Dirección:</strong> {s.direccion}</div>
                    <div><strong className="text-slate-500">CUIT:</strong> {s.cuit}</div>
                    <div><strong className="text-slate-500">Razón Social:</strong> {s.razonSocial || <span className="text-slate-400 italic">No cargada</span>}</div>
                    <div><strong className="text-slate-500">IIBB:</strong> {s.ingresosBrutos || <span className="text-slate-400 italic">Usa CUIT</span>}</div>
                    <div><strong className="text-slate-500">Inicio Act.:</strong> {s.inicioActividades || <span className="text-slate-400 italic">No cargada</span>}</div>
                    <div><strong className="text-slate-500">MP Device:</strong> {s.mpDeviceId || <span className="text-slate-400 italic">Sin vincular</span>}</div>
                  </div>

                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span>{s.cantUsuarios} usuario{s.cantUsuarios !== 1 ? 's' : ''}</span>
                    <span>{s.cantVentas} venta{s.cantVentas !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingId(s.id)}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 text-xs font-semibold"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Eliminar sucursal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deletingId}
        title="Eliminar sucursal"
        description="¿Seguro que querés eliminar esta sucursal? Se realizará un borrado lógico (soft delete)."
        confirmLabel="Sí, eliminar"
        loading={loading}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
