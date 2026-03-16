// src/app/admin/finanzas/loading.tsx
// Pantalla de carga al entrar a la pestaña Finanzas

export default function FinanzasLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse h-9 w-48 bg-slate-200 rounded-lg" />

      {/* Indicador principal de carga */}
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        {/* Logo MP con animación */}
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-[#009EE3] flex items-center justify-center shadow-xl shadow-[#009EE3]/25 animate-bounce" style={{ animationDuration: '2s' }}>
            <svg viewBox="0 0 24 24" fill="white" className="h-11 w-11">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          {/* Spinner orbital */}
          <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-transparent border-t-[#009EE3] animate-spin" style={{ animationDuration: '1.2s' }} />
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-slate-700">Buscando información en Mercado Pago</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md">
            Obteniendo ventas, comisiones y retenciones del período seleccionado. Esto puede tomar unos segundos...
          </p>
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="w-72 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full w-1/3 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #009EE3, #00B4FF, #009EE3)',
              animation: 'loading-bar 1.5s ease-in-out infinite',
            }}
          />
        </div>

        {/* Pasos de carga animados */}
        <div className="flex flex-col items-center gap-2 mt-2 text-sm text-slate-400">
          <span className="animate-pulse flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#009EE3]" />
            Conectando con la API de Mercado Pago...
          </span>
        </div>
      </div>

      {/* Cards skeleton debajo del indicador */}
      <div className="animate-pulse space-y-4">
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
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}
