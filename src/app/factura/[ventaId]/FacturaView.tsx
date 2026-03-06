'use client';

import { useEffect } from 'react';
import type { DatosFacturaImpresion } from '@/lib/types';
import FacturaSheet from './FacturaSheet';

type Props = { factura: DatosFacturaImpresion };

export default function FacturaView({ factura }: Props) {
  useEffect(() => {
    // Auto-print cuando se abre con ?print=1
    if (typeof window !== 'undefined' && window.location.search.includes('print=1')) {
      setTimeout(() => window.print(), 500);
    }
  }, []);

  const copias = ['ORIGINAL', 'DUPLICADO', 'TRIPLICADO'] as const;

  return (
    <>
      <style>{printStyles}</style>
      <div className="factura-container">
        {copias.map((copia, idx) => (
          <div key={copia} className={`factura-page ${idx < copias.length - 1 ? 'page-break' : ''}`}>
            <FacturaSheet factura={factura} copia={copia} />
          </div>
        ))}
      </div>
    </>
  );
}

const printStyles = `
  @media print {
    body { margin: 0; padding: 0; }
    .factura-container { margin: 0; padding: 0; }
    .factura-page { page-break-after: always; }
    .factura-page:last-child { page-break-after: auto; }
    .no-print { display: none !important; }
  }
  @media screen {
    body { background: #e5e7eb; margin: 0; }
    .factura-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px;
    }
    .factura-page {
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      border-radius: 4px;
    }
  }
  .page-break { page-break-after: always; }
`;
