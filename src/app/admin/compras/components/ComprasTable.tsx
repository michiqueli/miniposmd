'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Pencil, Image as ImageIcon, Filter } from 'lucide-react';
import { eliminarCompra, obtenerUrlFoto, type CompraListItem } from '../actions';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/toast';
import CompraFormModal from './CompraFormModal';

type Props = { compras: CompraListItem[] };

const CATEGORIA_FILTERS = [
  { label: 'Todas las categorías', value: 'ALL' },
  { label: 'Mercadería', value: 'Mercadería' },
  { label: 'Servicios', value: 'Servicios' },
  { label: 'Insumos', value: 'Insumos' },
  { label: 'Alquiler', value: 'Alquiler' },
  { label: 'Impuestos', value: 'Impuestos' },
  { label: 'Sueldos', value: 'Sueldos' },
];

const TIPO_COMP_FILTERS = [
  { label: 'Todos los comprobantes', value: 'ALL' },
  { label: 'Factura A', value: 'A' },
  { label: 'Factura B', value: 'B' },
  { label: 'Factura C', value: 'C' },
  { label: 'Sin comprobante', value: 'X' },
];

export default function ComprasTable({ compras }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  // Filters
  const [filtroCategoria, setFiltroCategoria] = useState('ALL');
  const [filtroTipoComp, setFiltroTipoComp] = useState('ALL');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editandoCompra, setEditandoCompra] = useState<CompraListItem | null>(null);
  const [compraAEliminar, setCompraAEliminar] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    return compras.filter((c) => {
      if (filtroCategoria !== 'ALL' && c.categoria !== filtroCategoria) return false;
      if (filtroTipoComp !== 'ALL' && c.tipoComprobante !== filtroTipoComp) return false;
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase();
        const match =
          c.descripcion.toLowerCase().includes(q) ||
          c.nombreProveedor?.toLowerCase().includes(q) ||
          c.cuitProveedor?.includes(q) ||
          c.nroComprobante?.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [compras, filtroCategoria, filtroTipoComp, filtroBusqueda]);

  const handleEliminar = async () => {
    if (!compraAEliminar) return;
    const res = await eliminarCompra(compraAEliminar);
    if (res.success) {
      showToast('Compra eliminada', 'success');
      router.refresh();
    } else {
      showToast(res.error || 'Error', 'error');
    }
    setCompraAEliminar(null);
  };

  const handleVerFoto = async (key: string) => {
    const res = await obtenerUrlFoto(key);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      showToast('Error al cargar la imagen', 'error');
    }
  };

  const totalFiltrado = filtradas.reduce((acc, c) => acc + c.monto, 0);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button
          onClick={() => {
            setEditandoCompra(null);
            setShowFormModal(true);
          }}
          className="flex items-center gap-1"
        >
          <Plus size={16} /> Nueva Compra
        </Button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-600"
        >
          <Filter size={14} /> Filtros
        </button>
        <div className="ml-auto text-sm text-slate-500">
          Mostrando <strong>{filtradas.length}</strong> compras · Total: <strong>${totalFiltrado.toFixed(2)}</strong>
        </div>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-200">
          <Select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-48">
            {CATEGORIA_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select value={filtroTipoComp} onChange={(e) => setFiltroTipoComp(e.target.value)} className="w-52">
            {TIPO_COMP_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input
            placeholder="Buscar proveedor, CUIT, descripción..."
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            className="w-64"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Proveedor</th>
                <th className="p-3 text-left">Categoría</th>
                <th className="p-3 text-left">Comp.</th>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-left">Método</th>
                <th className="p-3 text-left">Cargó</th>
                <th className="p-3 text-center">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No hay compras registradas
                  </td>
                </tr>
              )}
              {filtradas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-xs text-slate-400">{c.numeroCompra}</td>
                  <td className="p-3">
                    {new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{c.nombreProveedor || '-'}</div>
                    {c.cuitProveedor && (
                      <div className="text-[10px] text-slate-400 font-mono">{c.cuitProveedor}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                      {c.categoria}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.tipoComprobante ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        c.tipoComprobante === 'A'
                          ? 'bg-blue-100 text-blue-700'
                          : c.tipoComprobante === 'X'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        FC {c.tipoComprobante}
                      </span>
                    ) : '-'}
                    {c.nroComprobante && (
                      <div className="text-[10px] text-slate-400 mt-0.5">{c.nroComprobante}</div>
                    )}
                  </td>
                  <td className="p-3 max-w-[200px] truncate text-slate-600">{c.descripcion}</td>
                  <td className="p-3 text-right font-bold text-slate-800">${c.monto.toFixed(2)}</td>
                  <td className="p-3 text-xs text-slate-500">{c.metodoPago || '-'}</td>
                  <td className="p-3 text-xs text-slate-500">{c.usuario || '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {c.fotoTicketKey && (
                        <button
                          onClick={() => handleVerFoto(c.fotoTicketKey!)}
                          title="Ver foto"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                        >
                          <ImageIcon size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditandoCompra(c);
                          setShowFormModal(true);
                        }}
                        title="Editar"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setCompraAEliminar(c.id)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal (crear/editar) */}
      <CompraFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditandoCompra(null);
        }}
        editando={editandoCompra}
        onSuccess={() => {
          setShowFormModal(false);
          setEditandoCompra(null);
          router.refresh();
        }}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!compraAEliminar}
        title="Eliminar compra"
        description="Esta acción no se puede deshacer. ¿Querés continuar?"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onClose={() => setCompraAEliminar(null)}
        onConfirm={handleEliminar}
      />
    </>
  );
}
