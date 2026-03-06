export const CATEGORIAS_COMPRA = [
  'Mercadería',
  'Servicios',
  'Insumos',
  'Alquiler',
  'Impuestos',
  'Sueldos',
] as const;

export type CategoriaCompra = (typeof CATEGORIAS_COMPRA)[number];

export const METODOS_PAGO_COMPRA = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as const;
