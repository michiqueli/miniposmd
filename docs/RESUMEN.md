# MiniPOS - Resumen del Proyecto

## Descripcion General

**MiniPOS** es un sistema de punto de venta (POS) web orientado a gastronomia, desarrollado con **Next.js 16**, **React 19**, **Prisma ORM** y **PostgreSQL**. Incluye facturacion electronica AFIP, integracion con terminales MercadoPago, y un panel de administracion completo.

La app esta desplegada en produccion en el puerto 3001 con PM2 (`ecosystem.config.js`).

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 16.1.6 (App Router, React Compiler habilitado) |
| UI | React 19, Tailwind CSS v4, Radix UI (Dialog, Select, Toast, AlertDialog) |
| Iconos | Lucide React |
| ORM | Prisma 7.4 con adapter-pg |
| Base de datos | PostgreSQL |
| Autenticacion | Sesiones con cookies HMAC-signed (sin libreria externa) |
| Pagos | MercadoPago SDK (terminales Point + webhooks) |
| Facturacion | AFIP via @arcasdk/core (facturas A, B, C) |
| OCR | Google Generative AI (para tickets de compra) |
| Storage | MinIO (fotos de tickets) |
| PDF | jspdf + html2canvas-pro |
| QR | qrcode.react |
| Deploy | PM2 |

## Estructura de Archivos

```
src/
├── app/
│   ├── layout.tsx              # Layout raiz (Geist font, AppProviders)
│   ├── page.tsx                # Redirect: /pos o /login
│   ├── login/page.tsx          # Login por PIN
│   ├── pos/
│   │   ├── page.tsx            # POS page (SSR: carga productos + sucursal)
│   │   ├── actions.ts          # Server Actions: registrarVenta, facturarVenta, consultarCUIT
│   │   └── components/
│   │       └── PosShell.tsx    # Componente principal POS (client)
│   ├── admin/
│   │   ├── layout.tsx          # Layout admin (requireRole ADMIN + AdminNav)
│   │   ├── ventas/             # Listado de ventas
│   │   ├── compras/            # ABM compras con OCR
│   │   ├── productos/          # ABM productos
│   │   ├── usuarios/           # ABM usuarios
│   │   ├── sucursales/         # ABM sucursales
│   │   ├── dispositivos/       # Gestion terminales MP
│   │   ├── contable/           # Dashboard contable
│   │   └── finanzas/           # Dashboard financiero
│   ├── factura/[ventaId]/      # Vista de factura (para PDF/compartir)
│   ├── actions/
│   │   ├── auth.ts             # Login/logout actions
│   │   └── mercadopago.ts      # Acciones MP (cobro, polling, cancel)
│   └── api/webhooks/mercadopago/route.ts  # Webhook MP
├── components/
│   ├── admin/                  # AdminNav, ProductsTable, UsersTable, etc.
│   ├── pos/                    # CartPanel, PosTopBar, ProductGrid
│   ├── modals/                 # FacturacionModal, CompraModal
│   ├── providers/AppProviders.tsx  # Toast provider
│   └── ui/                     # Badge, Button, Card, Dialog, Input, Select, etc.
├── lib/
│   ├── auth.ts                 # Sesiones HMAC (cookie-based, 12h TTL)
│   ├── db.ts                   # Prisma client singleton
│   ├── security.ts             # hashPin/verifyPin (scrypt)
│   ├── afip.ts                 # Integracion AFIP (facturacion electronica)
│   ├── mercadopago.ts          # SDK MercadoPago
│   ├── minio.ts                # Cliente MinIO
│   ├── ocr-factura.ts          # OCR con Google AI
│   ├── generatePdf.ts          # Generacion PDF facturas
│   ├── cn.ts                   # Utility clsx + tailwind-merge
│   └── types.ts                # Tipos compartidos
prisma/
├── schema.prisma               # 7 modelos: Sucursal, Usuario, Producto, StockSucursal, Venta, VentaItem, Compra
└── seed.ts                     # Seed de datos iniciales
public/
└── terminal-types/             # SVGs de terminales MP
```

## Modelos de Datos (Prisma)

- **Sucursal**: Punto fisico de venta con datos fiscales (CUIT, regimen, punto de venta AFIP)
- **Usuario**: Autenticacion por PIN, roles ADMIN/CASHIER, vinculado a sucursal
- **Producto**: Doble precio (efectivo/digital), categorias, soft-delete
- **StockSucursal**: Stock por producto por sucursal (unique constraint)
- **Venta**: Con items detallados, estado de pago, datos de facturacion AFIP (CAE, tipo, nro)
- **VentaItem**: Lineas de venta con soporte para items manuales
- **Compra**: Registro de compras/gastos con datos fiscales del proveedor y OCR

## Flujos Principales

### POS (Punto de Venta)
1. Cajero selecciona productos de la grilla o agrega items manuales
2. Elige metodo de pago: Efectivo o Terminal MP
3. **Efectivo**: Se registra venta aprobada inmediatamente, opcion de facturar
4. **Terminal MP**: Se envia cobro a terminal fisica, polling cada 4s hasta aprobacion/rechazo
5. Post-venta: Modal de facturacion AFIP (A/B/C segun regimen) + compartir PDF

### Admin
- CRUD completo de productos, usuarios, sucursales
- Gestion de terminales MercadoPago
- Historial de ventas y compras
- Dashboard contable y financiero
- Carga de compras con OCR de tickets

## Autenticacion
- Login por seleccion de usuario + PIN (sin email/password)
- Cookie firmada con HMAC-SHA256, TTL 12 horas
- Roles: ADMIN (acceso total) y CASHIER (solo POS)
- Middleware basado en `requireRole()` en server components/actions

## Integraciones Externas
- **AFIP/ARCA**: Facturacion electronica (A, B, C), consulta padron CUIT
- **MercadoPago**: Cobro en terminales Point, webhooks de confirmacion, polling de ordenes
- **MinIO**: Storage de fotos de tickets de compra
- **Google Generative AI**: OCR para extraer datos de tickets fotografiados
