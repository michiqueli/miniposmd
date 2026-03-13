// src/app/admin/finanzas/loading.tsx
// Skeleton que se muestra mientras se cargan los datos de Finanzas

export default function FinanzasLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-48 bg-slate-200 rounded-lg" />

      {/* Selector de período skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <div className="h-10 w-24 bg-slate-200 rounded-xl" />
          <div className="h-10 w-20 bg-slate-200 rounded-xl" />
          <div className="h-10 w-20 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-xl" />
      </div>

      {/* 3 cards resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-200 rounded-xl" />
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-36 bg-slate-200 rounded" />
            <div className="flex gap-4">
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 2 cards caja/MP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-200 rounded-xl" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-4 w-28 bg-slate-100 rounded" />
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                <div className="h-5 w-24 bg-slate-200 rounded" />
                <div className="h-6 w-28 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla comisiones skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 rounded-xl" />
          <div className="space-y-1">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-8 w-full bg-slate-100 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-full bg-slate-50 rounded" />
          ))}
        </div>
      </div>

      {/* Indicador de carga centrado */}
      <div className="flex items-center justify-center gap-3 py-4">
        <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500 font-medium">Cargando datos de Mercado Pago...</span>
      </div>
    </div>
  )
}
