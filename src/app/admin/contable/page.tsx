// src/app/admin/contable/page.tsx
// ─────────────────────────────────────────────
// Página de contabilidad: Libros IVA + Posición fiscal
// ─────────────────────────────────────────────

import { getResumenIVA, getLibroIVAVentas, getLibroIVACompras } from './actions';
import ContableDashboard from './components/ContableDashboard';

export default async function ContablePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}) {
  const params = await searchParams;
  const hoy = new Date();
  const mes = params.mes ? parseInt(params.mes, 10) : hoy.getMonth() + 1;
  const anio = params.anio ? parseInt(params.anio, 10) : hoy.getFullYear();

  const [resumen, ventas, compras] = await Promise.all([
    getResumenIVA(mes, anio),
    getLibroIVAVentas(mes, anio),
    getLibroIVACompras(mes, anio),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Contable / IVA</h1>
      <ContableDashboard
        mes={mes}
        anio={anio}
        resumen={resumen}
        ventas={ventas}
        compras={compras}
      />
    </div>
  );
}
