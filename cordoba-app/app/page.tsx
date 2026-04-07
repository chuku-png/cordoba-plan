'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashData {
  total_ingresos: number
  total_gastos: number
  resultado_neto: number
  obras_activas: number
  a_pagar_semana: number
  deuda_proveedores: number
  adicionales_pendientes: number
  monto_adicionales_pendientes: number
  presupuestos_sin_respuesta: number
  mes: string
  semana: string
}

interface Resultado {
  tipo: string
  id: number
  titulo: string
  subtitulo: string | null
  href: string
}

interface Nota {
  id: number
  texto: string
  hecha: boolean
  fecha: string
  vencimiento?: string // datetime-local value: "2026-04-10T14:00"
}

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  cliente:        { label: 'Cliente',      color: 'bg-blue-100 text-blue-700' },
  obra:           { label: 'Obra',         color: 'bg-green-100 text-green-700' },
  proveedor:      { label: 'Proveedor',    color: 'bg-purple-100 text-purple-700' },
  material:       { label: 'Material',     color: 'bg-orange-100 text-orange-700' },
  pago_proveedor: { label: 'Pago',         color: 'bg-red-100 text-red-700' },
  ingreso:        { label: 'Cobro',        color: 'bg-emerald-100 text-emerald-700' },
  presupuesto:    { label: 'Presupuesto',  color: 'bg-indigo-100 text-indigo-700' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function Dashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  // Buscador
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [showResultados, setShowResultados] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notas
  const [notas, setNotas] = useState<Nota[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')

  // ── Cargar dashboard
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  // ── Cargar notas desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cordoba_notas')
    if (saved) setNotas(JSON.parse(saved))
  }, [])

  const guardarNotas = useCallback((nuevasNotas: Nota[]) => {
    setNotas(nuevasNotas)
    localStorage.setItem('cordoba_notas', JSON.stringify(nuevasNotas))
  }, [])

  // ── Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!busqueda.trim() || busqueda.length < 2) {
      setResultados([])
      setShowResultados(false)
      return
    }
    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(busqueda)}`)
      const data = await res.json()
      setResultados(data)
      setShowResultados(true)
      setBuscando(false)
    }, 300)
  }, [busqueda])

  // ── Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResultados(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const irA = (href: string) => {
    setShowResultados(false)
    setBusqueda('')
    router.push(href)
  }

  // ── Notas CRUD
  const agregarNota = () => {
    if (!nuevaNota.trim()) return
    const nota: Nota = {
      id: Date.now(),
      texto: nuevaNota.trim(),
      hecha: false,
      fecha: new Date().toLocaleDateString('es-AR'),
      vencimiento: nuevaFecha || undefined,
    }
    guardarNotas([nota, ...notas])
    setNuevaNota('')
    setNuevaFecha('')
  }

  const toggleNota = (id: number) =>
    guardarNotas(notas.map(n => n.id === id ? { ...n, hecha: !n.hecha } : n))

  const eliminarNota = (id: number) =>
    guardarNotas(notas.filter(n => n.id !== id))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const cards = [
    {
      label: `Ingresos ${data.mes}`, value: fmt(data.total_ingresos), valueClass: 'text-green-600',
      icon: <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      href: '/finanzas',
    },
    {
      label: `Gastos ${data.mes}`, value: fmt(data.total_gastos), valueClass: 'text-red-600',
      icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      href: '/finanzas',
    },
    {
      label: `Resultado neto ${data.mes}`, value: fmt(data.resultado_neto), valueClass: data.resultado_neto >= 0 ? 'text-gray-900' : 'text-red-600',
      icon: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      href: '/finanzas',
    },
    {
      label: 'Obras activas', value: String(data.obras_activas), valueClass: 'text-gray-900',
      icon: <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      href: '/clientes',
    },
    {
      label: 'A pagar esta semana', value: fmt(data.a_pagar_semana), valueClass: 'text-yellow-600', sub: data.semana,
      icon: <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      href: '/empleados',
    },
    {
      label: 'Deuda con proveedores', value: fmt(data.deuda_proveedores), valueClass: data.deuda_proveedores > 0 ? 'text-red-600' : 'text-gray-900',
      icon: <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      href: '/proveedores',
    },
  ]

  const notasPendientes = notas.filter(n => !n.hecha)
  const notasHechas = notas.filter(n => n.hecha)

  return (
    <div className="space-y-6">

      {/* Header + Buscador */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen general del negocio</p>
        </div>
        {/* Buscador */}
        <div ref={searchRef} className="relative w-80">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onFocus={() => resultados.length > 0 && setShowResultados(true)}
              placeholder="Buscar clientes, materiales, pagos..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 bg-white"
            />
            {buscando && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Dropdown resultados */}
          {showResultados && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
              {resultados.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {resultados.map((r, i) => {
                    const tipo = TIPO_LABEL[r.tipo] ?? { label: r.tipo, color: 'bg-gray-100 text-gray-600' }
                    return (
                      <li key={i}>
                        <button
                          onClick={() => irA(r.href)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${tipo.color}`}>
                            {tipo.label}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                            {r.subtitulo && <p className="text-xs text-gray-400 truncate">{r.subtitulo}</p>}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(card => (
          <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">{card.label}</p>
              {card.icon}
            </div>
            <p className={`text-2xl font-bold mt-2 ${card.valueClass}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
          </Link>
        ))}
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.adicionales_pendientes > 0 && (
          <Link href="/clientes" className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">{data.adicionales_pendientes} adicional{data.adicionales_pendientes > 1 ? 'es' : ''} sin cobrar</p>
                <p className="text-xs text-amber-600">{fmt(data.monto_adicionales_pendientes)} pendiente de cobro</p>
              </div>
            </div>
          </Link>
        )}
        {data.presupuestos_sin_respuesta > 0 && (
          <Link href="/presupuestos" className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">{data.presupuestos_sin_respuesta} presupuesto{data.presupuestos_sin_respuesta > 1 ? 's' : ''} en espera</p>
                <p className="text-xs text-blue-600">Sin respuesta del cliente</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Notas / TODO */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          Notas y recordatorios
          {notasPendientes.length > 0 && (
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {notasPendientes.length} pendiente{notasPendientes.length > 1 ? 's' : ''}
            </span>
          )}
        </h2>

        {/* Input nueva nota */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="text"
            value={nuevaNota}
            onChange={e => setNuevaNota(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarNota()}
            placeholder="Agregar recordatorio..."
            className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
          />
          <input
            type="datetime-local"
            value={nuevaFecha}
            onChange={e => setNuevaFecha(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 text-gray-600"
          />
          <button
            onClick={agregarNota}
            disabled={!nuevaNota.trim()}
            className="px-3 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] disabled:opacity-40"
          >
            +
          </button>
        </div>

        {notas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin notas todavía.</p>
        ) : (
          <ul className="space-y-1.5">
            {notasPendientes.map(n => {
              const ahora = new Date()
              const venc = n.vencimiento ? new Date(n.vencimiento) : null
              const vencido = venc && venc < ahora
              const hoy = venc && !vencido && venc.toDateString() === ahora.toDateString()
              const vencLabel = venc
                ? venc.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : null
              return (
                <li key={n.id} className="flex items-center gap-3 group py-1">
                  <button onClick={() => toggleNota(n.id)} className="w-4 h-4 rounded border-2 border-gray-300 hover:border-green-500 flex-shrink-0 transition-colors" />
                  <span className="flex-1 text-sm text-gray-800">{n.texto}</span>
                  {vencLabel && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                      vencido ? 'bg-red-100 text-red-600' :
                      hoy     ? 'bg-amber-100 text-amber-600' :
                                'bg-gray-100 text-gray-500'
                    }`}>
                      {vencido ? '⚠ ' : ''}{vencLabel}
                    </span>
                  )}
                  <button onClick={() => eliminarNota(n.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              )
            })}
            {notasHechas.length > 0 && (
              <>
                <li className="border-t border-gray-100 pt-1 mt-1" />
                {notasHechas.map(n => (
                  <li key={n.id} className="flex items-center gap-3 group py-1 opacity-50">
                    <button onClick={() => toggleNota(n.id)} className="w-4 h-4 rounded border-2 border-green-400 bg-green-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <span className="flex-1 text-sm text-gray-500 line-through">{n.texto}</span>
                    <button onClick={() => eliminarNota(n.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
      </div>

    </div>
  )
}
