'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { cambiarModoTerminal, getTerminalesMP, getSucursales, vincularTerminal } from '@/app/actions/mercadopago'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

type MPDevice = {
  id: string
  operating_mode: string
  name?: string | null
}

type Sucursal = {
  id: string
  nombre: string
  mpDeviceId?: string | null
}

const SIN_SUCURSAL_ASIGNADA = 'Sin sucursal asignada'

const TERMINAL_IMAGES = {
  smart: '/terminal-types/smart.svg',
  plus: '/terminal-types/plus.svg',
  flex: '/terminal-types/flex.svg',
  generic: '/terminal-types/generic.svg',
} as const

const getTerminalImage = (device: MPDevice) => {
  const searchable = `${device.name ?? ''} ${device.operating_mode ?? ''}`.toLowerCase()

  if (searchable.includes('smart')) {
    return { src: TERMINAL_IMAGES.smart, label: 'Terminal Smart' }
  }

  if (searchable.includes('plus')) {
    return { src: TERMINAL_IMAGES.plus, label: 'Terminal Plus' }
  }

  if (searchable.includes('flex')) {
    return { src: TERMINAL_IMAGES.flex, label: 'Terminal Flex' }
  }

  return { src: TERMINAL_IMAGES.generic, label: 'Terminal genérica' }
}

export default function TerminalManager() {
  const [devices, setDevices] = useState<MPDevice[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedSucursal, setSelectedSucursal] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loadingModeByDevice, setLoadingModeByDevice] = useState<Record<string, boolean>>({})
  const { showToast } = useToast()

  useEffect(() => {
    getSucursales().then((res) => {
      if (res.sucursales) {
        setSucursales(res.sucursales as Sucursal[])
      }
    })
  }, [])

  const buscarTerminales = async () => {
    setLoading(true)
    setMensaje('')

    const res = await getTerminalesMP()

    if (res.error) {
      setMensaje(`Error: ${res.error}`)
    } else {
      setDevices((res.devices || []) as MPDevice[])
      if (res.devices && res.devices.length === 0) {
        setMensaje('No se encontraron terminales activas.')
      }
    }

    setLoading(false)
  }

  const handleGuardarVinculo = async () => {
    if (!selectedDevice || !selectedSucursal) {
      return
    }

    const res = await vincularTerminal(selectedDevice, selectedSucursal)

    if (res.success) {
      showToast('¡Vinculación guardada!', 'success')
      setSelectedDevice(null)
      setSelectedSucursal('')
      setShowConfirm(false)

      const updatedSuc = await getSucursales()
      if (updatedSuc.sucursales) {
        setSucursales(updatedSuc.sucursales as Sucursal[])
      }
      return
    }

    showToast('Error al guardar la vinculación.', 'error')
    setShowConfirm(false)
  }



  const handleCambiarModo = async (deviceId: string, operatingMode: string) => {
    setLoadingModeByDevice((prev) => ({ ...prev, [deviceId]: true }))

    const res = await cambiarModoTerminal(deviceId, operatingMode)

    if (res.success) {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId ? { ...device, operating_mode: res.operating_mode || device.operating_mode } : device,
        ),
      )
      showToast('Modo de terminal actualizado.', 'success')
    } else {
      showToast(res.error || 'No se pudo cambiar el modo.', 'error')
    }

    setLoadingModeByDevice((prev) => ({ ...prev, [deviceId]: false }))
  }
  const getNombreSucursalAsociada = (deviceId: string) => {
    const sucursal = sucursales.find((s) => s.mpDeviceId === deviceId)
    return sucursal ? sucursal.nombre : SIN_SUCURSAL_ASIGNADA
  }

  const tieneSucursal = (deviceId: string) => getNombreSucursalAsociada(deviceId) !== SIN_SUCURSAL_ASIGNADA

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Terminales Mercado Pago</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestión por tarjeta para mantener una terminal por sucursal de forma clara.
          </p>
        </div>
        <Button onClick={buscarTerminales} disabled={loading}>
          {loading ? 'Buscando...' : 'Actualizar lista'}
        </Button>
      </CardHeader>

      <CardContent>
        {mensaje && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {mensaje}
          </p>
        )}

        {devices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Todavía no hay terminales cargadas. Presioná “Actualizar lista” para buscarlas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((dev) => {
              const nombreSucursal = getNombreSucursalAsociada(dev.id)
              const asociado = tieneSucursal(dev.id)
              const terminalVisual = getTerminalImage(dev)

              return (
                <div
                  key={dev.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${dev.operating_mode === 'PDV' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        />
                        <p className="text-sm font-semibold text-slate-700">{dev.operating_mode}</p>
                      </div>

                      <Image
                        src={terminalVisual.src}
                        alt={terminalVisual.label}
                        width={72}
                        height={48}
                        className="h-12 w-[72px] rounded-md border border-slate-200 bg-white p-1"
                      />
                    </div>

                    <p className="text-xs text-slate-500">{dev.name || terminalVisual.label}</p>

                    <Button
                      onClick={() => handleCambiarModo(dev.id, dev.operating_mode)}
                      disabled={loadingModeByDevice[dev.id]}
                      variant="ghost"
                      className="mt-2 h-7 border border-slate-300 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {loadingModeByDevice[dev.id]
                        ? 'Actualizando...'
                        : dev.operating_mode === 'PDV'
                          ? 'Cambiar a STANDALONE'
                          : 'Cambiar a PDV'}
                    </Button>

                    <p className={`mt-2 text-sm font-semibold ${asociado ? 'text-indigo-700' : 'text-slate-400'}`}>
                      {nombreSucursal}
                    </p>

                    <p className="mt-1 truncate font-mono text-xs text-slate-400" title={dev.id}>
                      ID: {dev.id}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-3">
                    {selectedDevice === dev.id ? (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Elegir sucursal</label>

                        <Select
                          value={selectedSucursal}
                          onChange={(e) => setSelectedSucursal(e.target.value)}
                          className="text-sm"
                        >
                          <option value="">-- Seleccionar --</option>
                          {sucursales.map((sucursal) => (
                            <option key={sucursal.id} value={sucursal.id}>
                              {sucursal.nombre} {sucursal.mpDeviceId ? '(Ya tiene terminal)' : ''}
                            </option>
                          ))}
                        </Select>

                        <div className="mt-1 flex gap-2">
                          <Button
                            onClick={() => setShowConfirm(true)}
                            disabled={!selectedSucursal}
                            className="h-8 flex-1 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                          >
                            Guardar
                          </Button>
                          <Button
                            onClick={() => setSelectedDevice(null)}
                            variant="ghost"
                            className="h-8 border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedDevice(dev.id)
                          setSelectedSucursal('')
                        }}
                        className="w-full"
                      >
                        {asociado ? 'Cambiar sucursal' : 'Vincular a sucursal'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <ConfirmDialog
          open={showConfirm}
          title="Confirmar vinculación"
          description={`¿Asignar la terminal ${selectedDevice ?? ''} a ${sucursales.find((sucursal) => sucursal.id === selectedSucursal)?.nombre ?? 'la sucursal seleccionada'}?`}
          confirmLabel="Sí, vincular"
          onClose={() => setShowConfirm(false)}
          onConfirm={handleGuardarVinculo}
        />
      </CardContent>
    </Card>
  )
}
