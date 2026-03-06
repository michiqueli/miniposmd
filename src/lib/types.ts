// src/lib/types.ts
// ─────────────────────────────────────────────
// Tipos compartidos en toda la aplicación
// ─────────────────────────────────────────────

// ── Enums de dominio ──
export type MetodoPago = 'EFECTIVO' | 'MP';
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'ANULADO';
export type TipoFactura = 'A' | 'B' | 'C';
export type TipoReceptor = 'CF' | 'CUIL';
export type RegimenFiscal = 'RI' | 'MONO';

// ── POS ──
export type ProductoPOS = {
  id: string;
  nombre: string;
  precioEfectivo: number;
  precioDigital: number;
  categoria: string;
};

export type ItemCarrito = ProductoPOS & { cantidad: number };

// ── Ventas (serializado para client components) ──
export type VentaRow = {
  id: string;
  numeroVenta: number;
  createdAt: string;
  fecha: string;
  total: number;
  metodoPago: string;
  estadoPago: string;
  nroFactura: number | null;
  tipoFactura: string | null;
  cae: string | null;
  caeVencimiento: string | null;
  docReceptor: string | null;
  sucursalNombre: string;
  usuarioNombre: string;
};

// ── Contable ──
export type FilaLibroIVAVentas = {
  fecha: string;
  tipoComprobante: string;
  puntoVenta: string;
  nroComprobante: string;
  docReceptor: string;
  denominacion: string;
  netoGravado: number;
  iva21: number;
  total: number;
  cae: string | null;
};

export type FilaLibroIVACompras = {
  fecha: string;
  proveedor: string;
  cuitProveedor: string;
  tipoComprobante: string;
  nroComprobante: string;
  netoGravado: number;
  iva21: number;
  total: number;
};

export type ResumenIVA = {
  cantFacturas: number;
  totalVentas: number;
  ivaDebitoFiscal: number;
  cantCompras: number;
  totalCompras: number;
  ivaCreditoFiscal: number;
  posicionIVA: number;
  debesPagar: boolean;
  recomendacion: string;
};

// ── Item de factura (para reimpresión) ──
export type ItemFacturaImpresion = {
  nombre: string;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
};

// ── Factura (para reimpresión) ──
export type DatosFacturaImpresion = {
  tipo: string | null;
  numero: number | null;
  puntoVenta: number;
  fecha: string;
  cae: string | null;
  caeVencimiento: string | null;
  cuit: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  regimen: string;
  ingresosBrutos: string;
  inicioActividades: string;
  docReceptor: string | null;
  razonSocialReceptor: string | null;
  total: number;
  neto: number;
  iva: number;
  metodoPago: string;
  vendedor: string;
  items: ItemFacturaImpresion[];
};
