// src/app/admin/dispositivos/page.tsx
// ─────────────────────────────────────────────
// Página de gestión de terminales MP
// (Renombrada de deviceManager a dispositivos para consistencia)
// AdminNav ya no se importa aquí — lo maneja el layout
// ─────────────────────────────────────────────

import DeviceManager from '@/components/admin/deviceManager/DeviceManager';

export default async function DispositivosPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Terminales</h1>
      <DeviceManager />
    </div>
  );
}
