'use client'

import { useEffect, useState, useCallback } from 'react'

interface Backup {
  nombre: string
  tamaño: number
  fecha: string
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function ConfiguracionPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [creandoBackup, setCreandoBackup] = useState(false)
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null)

  const cargarBackups = useCallback(async () => {
    setLoadingBackups(true)
    const res = await fetch('/api/backup')
    const data = await res.json()
    setBackups(Array.isArray(data) ? data : [])
    setLoadingBackups(false)
  }, [])

  useEffect(() => { cargarBackups() }, [cargarBackups])

  const hacerBackup = async () => {
    setCreandoBackup(true)
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setUltimoBackup(data.ruta)
        await cargarBackups()
      }
    } finally {
      setCreandoBackup(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Backup y ajustes del sistema</p>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Backup de base de datos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Copia de seguridad del archivo SQLite en la carpeta de backups</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={hacerBackup}
              disabled={creandoBackup}
              className="px-5 py-2 bg-[#1a1a2e] text-white text-sm rounded-lg hover:bg-[#16213e] disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              {creandoBackup ? 'Creando backup...' : 'Hacer backup ahora'}
            </button>
            {ultimoBackup && (
              <p className="text-xs text-green-600">Backup creado: <span className="font-mono">{ultimoBackup}</span></p>
            )}
          </div>

          {/* Lista de backups */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Backups disponibles</h3>
            {loadingBackups ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : backups.length === 0 ? (
              <p className="text-sm text-gray-400">No hay backups todavía.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Archivo</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Tamaño</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backups.map(b => (
                      <tr key={b.nombre} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">{b.nombre}</td>
                        <td className="px-4 py-2 text-right text-gray-500 text-xs">{fmtBytes(b.tamaño)}</td>
                        <td className="px-4 py-2 text-right text-gray-500 text-xs whitespace-nowrap">
                          {new Date(b.fecha).toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Los backups se guardan en <span className="font-mono">data/backups/</span>. Se conservan los últimos 30.
          </p>
        </div>
      </div>

      {/* Info del sistema */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Información del sistema</h2>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Base de datos</span>
            <span className="font-mono text-gray-700">data/cordoba.db (SQLite)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Modo</span>
            <span className="text-gray-700">Local — un solo usuario</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Stack</span>
            <span className="text-gray-700">Next.js 14 · TypeScript · Tailwind CSS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
