'use client'

import { useEffect, useState, useCallback } from 'react'

interface Item {
  id: number
  nombre: string | null
  deleted_at: string
  tabla: string
}

interface Grupo {
  label: string
  items: Item[]
}

type Grupos = Record<string, Grupo>

export default function PapeleraPage() {
  const [grupos, setGrupos] = useState<Grupos>({})
  const [loading, setLoading] = useState(true)
  const [restaurando, setRestaurando] = useState<string | null>(null)
  const [vaciando, setVaciando] = useState(false)
  const [confirmVaciar, setConfirmVaciar] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/papelera')
    const data = await res.json()
    setGrupos(data)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const restaurar = async (tabla: string, id: number) => {
    const key = `${tabla}-${id}`
    setRestaurando(key)
    await fetch('/api/papelera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabla, id }),
    })
    setRestaurando(null)
    await cargar()
  }

  const vaciarPapelera = async () => {
    setVaciando(true)
    await fetch('/api/papelera', { method: 'DELETE' })
    setVaciando(false)
    setConfirmVaciar(false)
    await cargar()
  }

  const totalItems = Object.values(grupos).reduce((s, g) => s + g.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Papelera</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `${totalItems} elemento${totalItems !== 1 ? 's' : ''} eliminado${totalItems !== 1 ? 's' : ''}`}
          </p>
        </div>
        {totalItems > 0 && (
          <button
            onClick={() => setConfirmVaciar(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Vaciar papelera
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Cargando...</div>
      ) : totalItems === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <p className="text-gray-400">La papelera está vacía</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([tabla, grupo]) => (
            <div key={tabla} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{grupo.label}</h2>
                <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">{grupo.items.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium text-gray-500">ID</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Nombre / Descripción</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Eliminado</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grupo.items.map(item => {
                    const key = `${tabla}-${item.id}`
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">#{item.id}</td>
                        <td className="px-4 py-2.5 text-gray-700">{item.nombre ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{item.deleted_at}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => restaurar(tabla, item.id)}
                            disabled={restaurando === key}
                            className="px-3 py-1 text-xs bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] disabled:opacity-50"
                          >
                            {restaurando === key ? 'Restaurando...' : 'Restaurar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Confirm vaciar */}
      {confirmVaciar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmVaciar(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Vaciar papelera</h3>
                <p className="text-sm text-gray-500">Esta acción es irreversible.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Se eliminarán definitivamente los <strong>{totalItems} elementos</strong> de la papelera. No se podrán recuperar.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                onClick={() => setConfirmVaciar(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                onClick={vaciarPapelera}
                disabled={vaciando}
              >
                {vaciando ? 'Vaciando...' : 'Sí, vaciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
