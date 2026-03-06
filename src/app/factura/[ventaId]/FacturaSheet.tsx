'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { DatosFacturaImpresion } from '@/lib/types';

type Props = {
  factura: DatosFacturaImpresion;
  copia: 'ORIGINAL' | 'DUPLICADO' | 'TRIPLICADO';
};

function pad(n: number | null, len: number) {
  return String(n ?? 0).padStart(len, '0');
}

function fmt(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFechaVto(yyyymmdd: string | null) {
  if (!yyyymmdd || yyyymmdd.length < 8) return '-';
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function tipoCompCodigo(tipo: string | null) {
  switch (tipo) {
    case 'A': return '01';
    case 'B': return '006';
    case 'C': return '011';
    default: return '006';
  }
}

function condicionIVA(regimen: string) {
  if (regimen === 'RI') return 'IVA Responsable Inscripto';
  if (regimen === 'MONO') return 'Responsable Monotributo';
  return regimen;
}

function condicionIVAReceptor(tipo: string | null, docReceptor: string | null) {
  if (tipo === 'A') return 'IVA Responsable Inscripto';
  return 'Consumidor Final';
}

function generarQRData(f: DatosFacturaImpresion) {
  const data = {
    ver: 1,
    fecha: f.fecha.split('T')[0],
    cuit: Number(f.cuit.replace(/\D/g, '')),
    ptoVta: f.puntoVenta,
    tipoCmp: f.tipo === 'A' ? 1 : f.tipo === 'C' ? 11 : 6,
    nroCmp: f.numero,
    importe: f.total,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: f.docReceptor ? 80 : 99,
    nroDocRec: f.docReceptor ? Number(f.docReceptor) : 0,
    tipoCodAut: 'E',
    codAut: Number(f.cae),
  };
  const json = JSON.stringify(data);
  const base64 = typeof btoa === 'function' ? btoa(json) : Buffer.from(json).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

export default function FacturaSheet({ factura: f, copia }: Props) {
  const esA = f.tipo === 'A';
  const esB = f.tipo === 'B';
  const qrUrl = generarQRData(f);

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '8mm 10mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9pt', color: '#000', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ border: '2px solid #000', marginBottom: '2mm' }}>
        {/* Copia label */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', padding: '2mm 0', borderBottom: '1px solid #000' }}>
          {copia}
        </div>

        {/* Main header row */}
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Left side - Business info */}
          <div style={{ flex: 1, padding: '4mm 5mm', paddingRight: '20mm' }}>
            <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '2mm' }}>{f.nombreComercial}</div>
            <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
              <strong>Razón Social:</strong> {f.razonSocial}
            </div>
            <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
              <strong>Domicilio Comercial:</strong> {f.direccion}
            </div>
            <div style={{ fontSize: '8pt' }}>
              <strong>Condición frente al IVA:</strong>&nbsp;&nbsp;{condicionIVA(f.regimen)}
            </div>
          </div>

          {/* Center - Type box */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '0',
            transform: 'translateX(-50%)',
            width: '28mm',
            textAlign: 'center',
            borderLeft: '2px solid #000',
            borderRight: '2px solid #000',
            borderBottom: '2px solid #000',
            background: '#fff',
            zIndex: 1,
          }}>
            <div style={{ fontSize: '28pt', fontWeight: 'bold', lineHeight: 1.1, paddingTop: '1mm' }}>
              {f.tipo || 'B'}
            </div>
            <div style={{ fontSize: '7pt', borderTop: '1px solid #000', padding: '1mm 0', textAlign: 'center' }}>
              COD. {tipoCompCodigo(f.tipo)}
            </div>
          </div>

          {/* Right side - Invoice info */}
          <div style={{ flex: 1, padding: '4mm 5mm', textAlign: 'left', paddingLeft: '20mm' }}>
            <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '2mm' }}>FACTURA</div>
            <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
              <strong>Punto de Venta:</strong> {pad(f.puntoVenta, 5)}&nbsp;&nbsp;&nbsp;&nbsp;
              <strong>Comp. Nro:</strong> {pad(f.numero, 8)}
            </div>
            <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
              <strong>Fecha de Emisión:</strong> {formatFecha(f.fecha)}
            </div>
            <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
              <strong>CUIT:</strong> {f.cuit}
            </div>
            <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
              <strong>Ingresos Brutos:</strong> {f.ingresosBrutos}
            </div>
            <div style={{ fontSize: '8pt' }}>
              <strong>Fecha de Inicio de Actividades:</strong> {f.inicioActividades}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PERÍODO Y VTO ═══ */}
      <div style={{ border: '2px solid #000', padding: '2mm 4mm', marginBottom: '2mm', fontSize: '8pt', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <strong>Período Facturado Desde:</strong> {formatFecha(f.fecha)}&nbsp;&nbsp;&nbsp;
          <strong>Hasta:</strong> {formatFecha(f.fecha)}
        </div>
        <div>
          <strong>Fecha de Vto. para el pago:</strong> {formatFecha(f.fecha)}
        </div>
      </div>

      {/* ═══ RECEPTOR ═══ */}
      <div style={{ border: '2px solid #000', padding: '2mm 4mm', marginBottom: '2mm', fontSize: '8pt' }}>
        <div style={{ display: 'flex', gap: '10mm', marginBottom: '1mm' }}>
          <div><strong>CUIT:</strong> {f.docReceptor || '-'}</div>
          <div style={{ flex: 1 }}><strong>Apellido y Nombre / Razón Social:</strong> {f.razonSocialReceptor || (f.docReceptor ? '' : 'Consumidor Final')}</div>
        </div>
        <div style={{ display: 'flex', gap: '10mm', marginBottom: '1mm' }}>
          <div><strong>Condición frente al IVA:</strong> {condicionIVAReceptor(f.tipo, f.docReceptor)}</div>
          <div><strong>Domicilio:</strong></div>
        </div>
        <div>
          <strong>Condición de venta:</strong> Otros medios de pago electrónico
        </div>
      </div>

      {/* ═══ ITEMS TABLE ═══ */}
      <div style={{ border: '2px solid #000', flex: 1, marginBottom: '2mm', display: 'flex', flexDirection: 'column' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8', borderBottom: '2px solid #000' }}>
              <th style={thStyle}>Código</th>
              <th style={{ ...thStyle, textAlign: 'left', width: '30%' }}>Producto / Servicio</th>
              <th style={thStyle}>Cantidad</th>
              <th style={thStyle}>U. Medida</th>
              <th style={thStyle}>Precio Unit.</th>
              <th style={thStyle}>% Bonif</th>
              {esA ? (
                <>
                  <th style={thStyle}>Subtotal</th>
                  <th style={thStyle}>Alícuota IVA</th>
                  <th style={thStyle}>Subtotal c/IVA</th>
                </>
              ) : (
                <>
                  <th style={thStyle}>Imp. Bonif.</th>
                  <th style={thStyle}>Subtotal</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {f.items.map((item, i) => {
              const netoUnit = esA ? +(item.precioUnit / 1.21).toFixed(2) : item.precioUnit;
              const netoSubtotal = esA ? +(item.subtotal / 1.21).toFixed(2) : item.subtotal;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{item.nombre}</td>
                  <td style={tdStyle}>{item.cantidad.toFixed(2)}</td>
                  <td style={tdStyle}>unidades</td>
                  <td style={tdStyle}>{fmt(netoUnit)}</td>
                  <td style={tdStyle}>0,00</td>
                  {esA ? (
                    <>
                      <td style={tdStyle}>{fmt(netoSubtotal)}</td>
                      <td style={tdStyle}>21%</td>
                      <td style={tdStyle}>{fmt(item.subtotal)}</td>
                    </>
                  ) : (
                    <>
                      <td style={tdStyle}>0,00</td>
                      <td style={tdStyle}>{fmt(item.subtotal)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ flex: 1 }} />
      </div>

      {/* ═══ TOTALS ═══ */}
      <div style={{ border: '2px solid #000', padding: '3mm 4mm', marginBottom: '2mm' }}>
        {esA ? (
          <FacturaATotals f={f} />
        ) : (
          <FacturaBTotals f={f} />
        )}
      </div>

      {/* ═══ TRANSPARENCIA FISCAL (solo Factura B) ═══ */}
      {esB && (
        <div style={{ border: '2px solid #000', padding: '2mm 4mm', marginBottom: '2mm', fontSize: '8pt' }}>
          <div style={{ borderBottom: '1px solid #000', paddingBottom: '1mm', marginBottom: '2mm', fontStyle: 'italic', fontSize: '7.5pt' }}>
            Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15mm' }}>
            <span><strong>IVA Contenido: $</strong></span>
            <span>{fmt(f.iva)}</span>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '2mm', fontSize: '8pt' }}>
        {/* QR Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
          <QRCodeSVG value={qrUrl} size={80} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginBottom: '2mm' }}>
              <strong style={{ fontSize: '12pt', letterSpacing: '1px' }}>ARCA</strong>
            </div>
            <div style={{ fontSize: '7pt', fontStyle: 'italic', color: '#666' }}>
              Comprobante Autorizado
            </div>
            <div style={{ fontSize: '6pt', color: '#999', maxWidth: '50mm', marginTop: '1mm' }}>
              Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación
            </div>
          </div>
        </div>

        {/* Page */}
        <div style={{ textAlign: 'center' }}>
          Pág. 1/1
        </div>

        {/* CAE */}
        <div style={{ textAlign: 'right' }}>
          <div><strong>CAE N°:</strong> {f.cae}</div>
          <div><strong>Fecha de Vto. de CAE:</strong> {formatFechaVto(f.caeVencimiento)}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Totales Factura A ── */
function FacturaATotals({ f }: { f: DatosFacturaImpresion }) {
  return (
    <div style={{ fontSize: '8pt' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4mm', marginBottom: '1mm' }}>
        <span>Importe Otros Tributos: $</span><span style={{ minWidth: '20mm', textAlign: 'right' }}>0,00</span>
      </div>
      <div style={{ height: '1px', background: '#ccc', margin: '2mm 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1mm' }}>
        <Row label="Importe Neto Gravado: $" value={fmt(f.neto)} />
        <Row label="IVA 27%: $" value="0,00" />
        <Row label="IVA 21%: $" value={fmt(f.iva)} bold highlight />
        <Row label="IVA 10,5%: $" value="0,00" />
        <Row label="IVA 5%: $" value="0,00" />
        <Row label="IVA 2,5%: $" value="0,00" />
        <Row label="IVA 0%: $" value="0,00" />
        <Row label="Importe Otros Tributos: $" value="0,00" />
        <div style={{ height: '1px', background: '#000', width: '100%', margin: '1mm 0' }} />
        <Row label="Importe Total: $" value={fmt(f.total)} bold />
      </div>
    </div>
  );
}

/* ── Totales Factura B ── */
function FacturaBTotals({ f }: { f: DatosFacturaImpresion }) {
  return (
    <div style={{ fontSize: '8pt', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1mm' }}>
      <Row label="Subtotal: $" value={fmt(f.total)} />
      <Row label="Importe Otros Tributos: $" value="0,00" />
      <div style={{ height: '1px', background: '#000', width: '60%', margin: '1mm 0' }} />
      <Row label="Importe Total: $" value={fmt(f.total)} bold />
    </div>
  );
}

/* ── Row helper ── */
function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '4mm',
      fontWeight: bold ? 'bold' : 'normal',
      backgroundColor: highlight ? '#ffeb3b' : 'transparent',
      padding: highlight ? '0 2mm' : '0',
    }}>
      <span>{label}</span>
      <span style={{ minWidth: '22mm', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/* ── Styles ── */
const thStyle: React.CSSProperties = {
  padding: '2mm 3mm',
  textAlign: 'right',
  fontWeight: 'bold',
  fontSize: '7.5pt',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '1.5mm 3mm',
  textAlign: 'right',
  fontSize: '8pt',
};
