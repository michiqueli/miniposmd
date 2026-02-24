 main# 🚀 MiniPOS — Guía de Upgrade Completo

## Archivos incluidos en este upgrade

### NUEVOS (crear)
```
src/lib/types.ts                           → Tipos compartidos
src/lib/mercadopago.ts                     → Helper centralizado MP
src/lib/afip.ts                            → Integración real AFIP
src/app/admin/layout.tsx                   → Layout admin (AdminNav + auth)
src/app/admin/contable/page.tsx            → Página contable
src/app/admin/contable/actions.ts          → Server actions contables
src/app/admin/contable/components/ContableDashboard.tsx → UI contable
src/app/admin/dispositivos/page.tsx        → Renombrado de deviceManager
```

### MODIFICADOS (reemplazar el archivo completo)
```
prisma/schema.prisma                       → VentaItem, Compra mejorada, sin Configuracion
src/app/actions/mercadopago.ts             → FIX polling + mpFetch
src/app/api/webhooks/mercadopago/route.ts  → Maneja Orders + legacy
src/app/pos/actions.ts                     → AFIP real + guarda VentaItems
src/app/pos/components/PosShell.tsx        → Usa consultarEstadoOrden
src/app/admin/ventas/page.tsx              → Sin AdminNav (usa layout)
src/app/admin/ventas/actions.ts            → Estados unificados + reimpresión
src/app/admin/ventas/components/VentasTable.tsx → Reimpresión + estados unificados
src/components/admin/AdminNav.tsx          → Link a "Contable"
ecosystem.config.js                        → Sin AUTH_SECRET hardcodeado
```

### ELIMINAR
```
src/app/pos/mp-action.ts                   → Código muerto (API Preferencias)
src/components/admin/VentasTable.tsx        → Duplicado (usar la de ventas/components/)
```

---

## Paso a paso para aplicar

### 1. Instalar dependencias nuevas
```bash
npm install @afipsdk/afip.js
```

### 2. Actualizar variables de entorno (.env)
```env
# Existentes
DATABASE_URL=...
MP_ACCESS_TOKEN_PROD=...
MP_WEBHOOK_SECRET=...
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com

# NUEVO: Rotar esta clave (la vieja fue expuesta en ecosystem.config.js)
AUTH_SECRET=<generar una nueva con: openssl rand -base64 32>

# NUEVO: AFIP
AFIP_CUIT=20XXXXXXXX9
AFIP_CERT_PATH=certs/cert.crt
AFIP_KEY_PATH=certs/key.key
AFIP_PRODUCTION=false
```

### 3. Aplicar migración de Prisma
```bash
npx prisma migrate dev --name upgrade-contable
```

Esto creará:
- Tabla `VentaItem`
- Campos `mpOrderId`, `caeVencimiento`, `docReceptor` en `Venta`
- Campos `cuitProveedor`, `nombreProveedor`, `tipoComprobante`,
  `nroComprobante`, `netoGravado`, `ivaDiscriminado` en `Compra`
- Eliminará tabla `Configuracion`

### 4. Copiar los archivos nuevos y modificados

### 5. Eliminar archivos obsoletos
```bash
rm src/app/pos/mp-action.ts
rm src/components/admin/VentasTable.tsx
```

### 6. Actualizar imports en páginas admin que usaban AdminNav
Las páginas `productos/page.tsx`, `usuarios/page.tsx` ya no necesitan:
```diff
- import AdminNav from '@/components/admin/AdminNav';
- await requireRole(['ADMIN']);
  // ... y en el return:
- <div className="p-8 min-h-screen bg-slate-50">
-   <AdminNav />
+ <div>
```
El layout se encarga de todo eso.

### 7. Actualizar link de Terminales en AdminNav
Si mantenés la ruta vieja `/admin/deviceManager`, cambiá el href en AdminNav.
Si renombrás a `/admin/dispositivos`, el archivo nuevo ya lo tiene.

### 8. Build y deploy
```bash
npm run build
pm2 restart ecoparri
```

---

## Resumen de qué se arregló/mejoró

| Cambio | Descripción |
|--------|-------------|
| **FIX: Polling MP** | Ahora consulta `/v1/orders/{id}` en vez de `/payment-intents/{id}` |
| **FIX: Webhook** | Maneja notificaciones de la API de Orders además de legacy |
| **FIX: Seguridad** | AUTH_SECRET sacado de ecosystem.config.js |
| **FIX: Estados** | Unificados a PENDIENTE/APROBADO/ANULADO |
| **NUEVO: AFIP real** | Integración con @afipsdk/afip.js |
| **NUEVO: VentaItem** | Se guarda el detalle de cada venta |
| **NUEVO: Reimpresión** | Botón para reimprimir facturas ya emitidas |
| **NUEVO: Contable** | Libros IVA Ventas/Compras + Posición IVA |
| **NUEVO: Admin layout** | AdminNav + requireRole una sola vez |
| **NUEVO: Tipos centralizados** | src/lib/types.ts |
| **NUEVO: mpFetch helper** | src/lib/mercadopago.ts |
| **LIMPIEZA** | Eliminado mp-action.ts, VentasTable duplicada, modelo Configuracion |
