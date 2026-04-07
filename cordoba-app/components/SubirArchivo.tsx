'use client'

import { useRef, useState, DragEvent } from 'react'
import type { ResumenMateriales, ResumenPresupuesto } from '@/lib/ia'

type ResultadoIA =
  | { tipo: 'materiales'; archivo: string; resumen: ResumenMateriales }
  | { tipo: 'presupuesto'; archivo: string; paginas: number; resumen: ResumenPresupuesto }

interface Props {
  onResultado: (resultado: ResultadoIA) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function SubirArchivo({ onResultado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoIA | null>(null)
  const [archivoNombre, setArchivoNombre] = useState('')
  const [drag, setDrag] = useState(false)

  const procesarArchivo = async (file: File) => {
    setError('')
    setResultado(null)
    setArchivoNombre(file.name)
    setProcesando(true)

    try {
      const formData = new FormData()
      formData.append('archivo', file)

      const res = await fetch('/api/ia/procesar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al procesar el archivo')
        return
      }

      setResultado(data as ResultadoIA)
    } catch (e) {
      setError(String(e))
    } finally {
      setProcesando(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
    e.target.value = ''
  }

  const confirmar = () => {
    if (resultado) onResultado(resultado)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          drag ? 'border-[#1a1a2e] bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.ods,.pdf" className="hidden" onChange={onFileChange} />
        {procesando ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-[#1a1a2e] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <div>
              <p className="font-medium text-gray-700">Procesando {archivoNombre}...</p>
              <p className="text-sm text-gray-400 mt-1">Analizando con IA, esto puede demorar unos segundos</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-600">Arrastrá o hacé clic para subir</p>
            <p className="text-xs text-gray-400">Excel (.xlsx, .xls) para materiales · PDF para presupuestos</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Preview resultado */}
      {resultado && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${resultado.tipo === 'materiales' ? 'bg-green-100' : 'bg-blue-100'}`}>
                {resultado.tipo === 'materiales' ? (
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {resultado.tipo === 'materiales' ? 'Planilla de materiales detectada' : 'Presupuesto detectado'}
              </span>
            </div>
            <span className="text-xs text-gray-400">{resultado.archivo}</span>
          </div>

          {resultado.tipo === 'materiales' && <PreviewMateriales resumen={resultado.resumen} />}
          {resultado.tipo === 'presupuesto' && <PreviewPresupuesto resumen={resultado.resumen} />}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setResultado(null); setArchivoNombre('') }}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Descartar
            </button>
            <button
              onClick={confirmar}
              className="flex-1 px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e]"
            >
              Confirmar y usar datos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewMateriales({ resumen }: { resumen: ResumenMateriales }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {(resumen.proveedor || resumen.obra || resumen.fecha) && (
        <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-3 gap-2 text-xs">
          {resumen.proveedor && <div><span className="text-gray-400">Proveedor:</span> <span className="font-medium">{resumen.proveedor}</span></div>}
          {resumen.obra && <div><span className="text-gray-400">Obra:</span> <span className="font-medium">{resumen.obra}</span></div>}
          {resumen.fecha && <div><span className="text-gray-400">Fecha:</span> <span className="font-medium">{resumen.fecha}</span></div>}
        </div>
      )}
      {resumen.items.length > 0 && (
        <table className="w-full text-xs">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-gray-500">Descripción</th>
              <th className="text-right px-3 py-2 text-gray-500">Cantidad</th>
              <th className="text-right px-3 py-2 text-gray-500">Total</th>
              <th className="text-center px-3 py-2 text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {resumen.items.slice(0, 8).map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">{item.descripcion}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">{item.cantidad != null ? `${item.cantidad} ${item.unidad ?? ''}` : '—'}</td>
                <td className="px-3 py-1.5 text-right">{fmt(item.total)}</td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    item.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                    item.estado === 'sin_retirar' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{item.estado ?? 'pendiente'}</span>
                </td>
              </tr>
            ))}
            {resumen.items.length > 8 && (
              <tr><td colSpan={4} className="px-3 py-1.5 text-gray-400 text-center">... y {resumen.items.length - 8} items más</td></tr>
            )}
          </tbody>
        </table>
      )}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-4 text-xs">
        <span className="font-semibold">Total: {fmt(resumen.total_general)}</span>
        {resumen.total_pagado != null && <span className="text-green-600">Pagado: {fmt(resumen.total_pagado)}</span>}
        {resumen.total_pendiente != null && <span className="text-red-600">Pendiente: {fmt(resumen.total_pendiente)}</span>}
      </div>
    </div>
  )
}

function PreviewPresupuesto({ resumen }: { resumen: ResumenPresupuesto }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {(resumen.cliente || resumen.obra || resumen.fecha) && (
        <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-3 gap-2 text-xs">
          {resumen.cliente && <div><span className="text-gray-400">Cliente:</span> <span className="font-medium">{resumen.cliente}</span></div>}
          {resumen.obra && <div><span className="text-gray-400">Obra:</span> <span className="font-medium">{resumen.obra}</span></div>}
          {resumen.fecha && <div><span className="text-gray-400">Fecha:</span> <span className="font-medium">{resumen.fecha}</span></div>}
        </div>
      )}
      {resumen.descripcion_general && (
        <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-200">{resumen.descripcion_general}</div>
      )}
      {resumen.items.length > 0 && (
        <table className="w-full text-xs">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-gray-500">Ítem</th>
              <th className="text-right px-3 py-2 text-gray-500">Cantidad</th>
              <th className="text-right px-3 py-2 text-gray-500">P. Unit.</th>
              <th className="text-right px-3 py-2 text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {resumen.items.slice(0, 8).map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">{item.descripcion}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">{item.cantidad != null ? `${item.cantidad} ${item.unidad ?? ''}` : '—'}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">{item.precio_unitario != null ? fmt(item.precio_unitario) : '—'}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(item.subtotal)}</td>
              </tr>
            ))}
            {resumen.items.length > 8 && (
              <tr><td colSpan={4} className="px-3 py-1.5 text-gray-400 text-center">... y {resumen.items.length - 8} ítems más</td></tr>
            )}
          </tbody>
        </table>
      )}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-4 text-xs">
        {resumen.subtotal != null && <span>Subtotal: {fmt(resumen.subtotal)}</span>}
        {resumen.iva != null && <span>IVA: {fmt(resumen.iva)}</span>}
        <span className="font-semibold">Total: {fmt(resumen.total)}</span>
      </div>
      {resumen.notas && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200">{resumen.notas}</div>
      )}
    </div>
  )
}
