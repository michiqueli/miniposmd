'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Check, X, AlertTriangle, FileText } from 'lucide-react';
import { anularVenta, actualizarVenta } from '../actions';
import { facturarVenta } from '@/app/pos/actions';
import FacturacionModal from '@/components/modals/FacturacionModal';

export default function VentasTable({ ventas }: { ventas: any[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempMetodo, setTempMetodo] = useState('');
  const [tempEstado, setTempEstado] = useState('');

  // Estados para Facturación
  const [ventaAFacturar, setVentaAFacturar] = useState<string | null>(null);
  const [cargandoFactura, setCargandoFactura] = useState(false);

  const handleEditClick = (venta: any) => {
    setEditingId(venta.id);
    setTempMetodo(venta.metodoPago);
    setTempEstado(venta.estadoPago);
  };

  const handleSave = async (id: string) => {
    await actualizarVenta(id, tempMetodo, tempEstado);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que querés ANULAR esta venta? Esto no se puede deshacer.')) {
      await anularVenta(id);
    }
  };

  // Función que se ejecuta al confirmar en el modal
  const handleConfirmFactura = async (datos: { tipo: string, receptorId: string }) => {
    if (!ventaAFacturar) return;
    
    setCargandoFactura(true);
    const res = await facturarVenta(ventaAFacturar, datos);
    
    if (res.success) {
      alert(`✅ Factura Generada: CAE ${res.cae}`);
      setVentaAFacturar(null);
      router.refresh();
    } else {
      alert(`❌ Error AFIP: ${res.error}`);
    }
    setCargandoFactura(false);
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3">{new Date(v.createdAt).toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 font-bold text-slate-800">${v.total.toFixed(2)}</td>
                
                {/* MÉTODO */}
                <td className="px-4 py-3">
                  {editingId === v.id ? (
                    <select value={tempMetodo} onChange={(e) => setTempMetodo(e.target.value)} className="p-1 border rounded">
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="MP">MERCADO PAGO</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${v.metodoPago === 'MP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {v.metodoPago}
                    </span>
                  )}
                </td>

                {/* FACTURA (ESTADO) */}
                <td className="px-4 py-3">
                  {v.nroFactura ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-blue-600">FC-{v.nroFactura}</span>
                      <span className="text-[10px] text-slate-400">CAE: {v.cae}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Pendiente</span>
                  )}
                </td>

                {/* ACCIONES */}
                <td className="px-4 py-3 text-right flex justify-end gap-2 items-center">
                  {editingId === v.id ? (
                    <>
                      <button onClick={() => handleSave(v.id)} className="p-2 bg-green-100 text-green-600 rounded"><Check size={16}/></button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-600 rounded"><X size={16}/></button>
                    </>
                  ) : (
                    <>
                      {/* BOTÓN FACTURAR: Solo aparece si NO tiene factura */}
                      {!v.nroFactura && (
                        <button 
                          onClick={() => setVentaAFacturar(v.id)} 
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
                          title="Generar Factura AFIP"
                        >
                          <FileText size={14} /> AFIP
                        </button>
                      )}

                      <button onClick={() => handleEditClick(v)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE FACTURACIÓN (Se abre solo si ventaAFacturar tiene un ID) */}
      <FacturacionModal 
        isOpen={!!ventaAFacturar}
        onClose={() => setVentaAFacturar(null)}
        onConfirm={handleConfirmFactura}
        cargando={cargandoFactura}
      />
    </>
  );
}