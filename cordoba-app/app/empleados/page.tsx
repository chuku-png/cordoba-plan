'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  format, eachDayOfInterval, isSameDay, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Empleado {
  id: number
  nombre: string
  jornal_habitual: number
  total_jornales: number
  total_anticipos: number
  deleted_at: string | null
}

interface Jornal {
  id: number
  empleado_id: number
  obra_id: number | null
  fecha: string
  monto: number
  tipo: 'jornal' | 'anticipo'
  observaciones: string | null
  empleado_nombre: string
  obra_nombre: string | null
}

interface Obra { id: number; nombre: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Lunes como primer día de semana
const lunesDe = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })
const domingoDe = (d: Date) => endOfWeek(d, { weekStartsOn: 1 })

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EmpleadosPage() {
  const [semanaBase, setSemanaBase] = useState(() => lunesDe(new Date()))
  const diasSemana = eachDayOfInterval({ start: semanaBase, end: domingoDe(semanaBase) })

  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [jornales,  setJornales]  = useState<Jornal[]>([])
  const [obras,     setObras]     = useState<Obra[]>([])

  // ── Tab activo: 'semana' | 'empleados'
  const [tab, setTab] = useState<'semana' | 'empleados'>('semana')

  // ── Modal jornal/anticipo
  const [modalJornal, setModalJornal] = useState(false)
  const [editJornal,  setEditJornal]  = useState<Jornal | null>(null)
  const [formJornal, setFormJornal] = useState({
    empleado_id: '', obra_id: '', fecha: format(new Date(), 'yyyy-MM-dd'),
    monto: '', tipo: 'jornal' as 'jornal' | 'anticipo', observaciones: '',
  })

  // ── Modal empleado
  const [modalEmpleado, setModalEmpleado] = useState(false)
  const [editEmpleado,  setEditEmpleado]  = useState<Empleado | null>(null)
  const [formEmpleado, setFormEmpleado] = useState({ nombre: '', jornal_habitual: '' })

  // ── Eliminar
  const [eliminando, setEliminando] = useState<{ tipo: 'jornal' | 'empleado'; id: number; label: string } | null>(null)
  const [cargandoEliminar, setCargandoEliminar] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // ── Carga ─────────────────────────────────────────────────────────────────
  const cargarEmpleados = useCallback(async () => {
    const res = await fetch('/api/empleados')
    setEmpleados(await res.json())
  }, [])

  const cargarJornales = useCallback(async () => {
    const desde = format(semanaBase, 'yyyy-MM-dd')
    const hasta = format(domingoDe(semanaBase), 'yyyy-MM-dd')
    const res = await fetch(`/api/jornales?desde=${desde}&hasta=${hasta}`)
    setJornales(await res.json())
  }, [semanaBase])

  useEffect(() => { cargarEmpleados() }, [cargarEmpleados])
  useEffect(() => { cargarJornales() }, [cargarJornales])
  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(setObras)
  }, [])

  // ── Navegación de semana ──────────────────────────────────────────────────
  const semanaAnterior = () => setSemanaBase(s => lunesDe(subWeeks(s, 1)))
  const semanaSiguiente = () => setSemanaBase(s => lunesDe(addWeeks(s, 1)))
  const semanaActual = () => setSemanaBase(lunesDe(new Date()))

  // ── Helpers grilla ────────────────────────────────────────────────────────
  // Jornales de un empleado en un día concreto
  const jornalesEnDia = (empleadoId: number, dia: Date) =>
    jornales.filter(j => j.empleado_id === empleadoId && isSameDay(parseISO(j.fecha), dia))

  // Total a cobrar en la semana por empleado (jornales - anticipos)
  const totalSemana = (empleadoId: number) => {
    const js = jornales.filter(j => j.empleado_id === empleadoId)
    const totalJ = js.filter(j => j.tipo === 'jornal').reduce((s, j) => s + j.monto, 0)
    const totalA = js.filter(j => j.tipo === 'anticipo').reduce((s, j) => s + j.monto, 0)
    return { jornales: totalJ, anticipos: totalA, aCobrar: totalJ - totalA }
  }

  // ── Abrir modales ─────────────────────────────────────────────────────────
  const abrirJornal = (empleadoId?: number, dia?: Date, j?: Jornal) => {
    setEditJornal(j ?? null)
    setFormJornal(j ? {
      empleado_id: String(j.empleado_id), obra_id: j.obra_id?.toString() ?? '',
      fecha: j.fecha, monto: String(j.monto), tipo: j.tipo,
      observaciones: j.observaciones ?? '',
    } : {
      empleado_id: empleadoId ? String(empleadoId) : '',
      obra_id: '', fecha: dia ? format(dia, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      monto: empleadoId
        ? String(empleados.find(e => e.id === empleadoId)?.jornal_habitual ?? '')
        : '',
      tipo: 'jornal', observaciones: '',
    })
    setError('')
    setModalJornal(true)
  }

  const abrirEmpleado = (e?: Empleado) => {
    setEditEmpleado(e ?? null)
    setFormEmpleado(e
      ? { nombre: e.nombre, jornal_habitual: String(e.jornal_habitual) }
      : { nombre: '', jornal_habitual: '' })
    setError('')
    setModalEmpleado(true)
  }

  // ── Guardar jornal ────────────────────────────────────────────────────────
  const guardarJornal = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!formJornal.empleado_id || !formJornal.monto || !formJornal.fecha) {
      setError('Empleado, monto y fecha son obligatorios'); return
    }
    setGuardando(true); setError('')
    const url    = editJornal ? `/api/jornales/${editJornal.id}` : '/api/jornales'
    const method = editJornal ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empleado_id: Number(formJornal.empleado_id),
        obra_id:     formJornal.obra_id ? Number(formJornal.obra_id) : null,
        fecha:       formJornal.fecha,
        monto:       Number(formJornal.monto),
        tipo:        formJornal.tipo,
        observaciones: formJornal.observaciones || null,
      }),
    })
    if (res.ok) { await cargarJornales(); setModalJornal(false) }
    else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  // ── Guardar empleado ──────────────────────────────────────────────────────
  const guardarEmpleado = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!formEmpleado.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true); setError('')
    const url    = editEmpleado ? `/api/empleados/${editEmpleado.id}` : '/api/empleados'
    const method = editEmpleado ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: formEmpleado.nombre,
        jornal_habitual: formEmpleado.jornal_habitual ? Number(formEmpleado.jornal_habitual) : 0,
      }),
    })
    if (res.ok) { await cargarEmpleados(); setModalEmpleado(false) }
    else { const d = await res.json(); setError(d.error ?? 'Error') }
    setGuardando(false)
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const confirmarEliminar = async () => {
    if (!eliminando) return
    setCargandoEliminar(true)
    const ruta = eliminando.tipo === 'jornal' ? '/api/jornales' : '/api/empleados'
    await fetch(`${ruta}/${eliminando.id}`, { method: 'DELETE' })
    if (eliminando.tipo === 'jornal') await cargarJornales()
    else await cargarEmpleados()
    setEliminando(null); setCargandoEliminar(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const totalGralSemana = empleados.reduce((s, e) => {
    const t = totalSemana(e.id)
    return s + t.aCobrar
  }, 0)

  return (
    <div className="space-y-5">

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['semana', 'empleados'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === t ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'semana' ? 'Vista semanal' : 'Empleados'}
          </button>
        ))}
      </div>

      {/* ══ TAB SEMANA ══════════════════════════════════════════════════════ */}
      {tab === 'semana' && (
        <div className="space-y-4">

          {/* Selector de semana */}
          <div className="flex items-center gap-3">
            <button onClick={semanaAnterior}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              ← Anterior
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[220px] text-center">
              {format(semanaBase, "d 'de' MMMM", { locale: es })} —{' '}
              {format(domingoDe(semanaBase), "d 'de' MMMM yyyy", { locale: es })}
            </span>
            <button onClick={semanaSiguiente}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Siguiente →
            </button>
            <button onClick={semanaActual}
              className="px-3 py-1.5 text-sm text-[#1a1a2e] border border-[#1a1a2e]/30 rounded-lg hover:bg-[#1a1a2e]/5">
              Hoy
            </button>
            <button onClick={() => abrirJornal()}
              className="ml-auto px-4 py-1.5 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e]">
              + Registrar jornal
            </button>
          </div>

          {/* Resumen semanal total */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total a pagar esta semana</span>
            <span className="text-lg font-bold text-[#1a1a2e]">{fmt(totalGralSemana)}</span>
          </div>

          {/* Grilla empleado × día */}
          {empleados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No hay empleados. Agregá uno en la pestaña "Empleados".
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-40">
                      Empleado
                    </th>
                    {diasSemana.map((dia, i) => (
                      <th key={i} className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase text-center">
                        <div>{DIAS_CORTOS[i]}</div>
                        <div className="font-normal text-gray-400">{format(dia, 'd/M')}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                      A cobrar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((emp) => {
                    const { jornales: totalJ, anticipos: totalA, aCobrar } = totalSemana(emp.id)
                    return (
                      <tr key={emp.id} className="border-b border-gray-100 last:border-0">
                        {/* Nombre empleado */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{emp.nombre}</p>
                          <p className="text-xs text-gray-400">{fmt(emp.jornal_habitual)}/día</p>
                        </td>

                        {/* Celda por día */}
                        {diasSemana.map((dia, i) => {
                          const js = jornalesEnDia(emp.id, dia)
                          return (
                            <td key={i} className="px-2 py-2 text-center align-top">
                              {js.length > 0 ? (
                                <div className="space-y-1">
                                  {js.map((j) => (
                                    <div key={j.id}
                                      className={`text-xs rounded px-1.5 py-1 cursor-pointer group relative ${
                                        j.tipo === 'jornal'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-orange-100 text-orange-800'
                                      }`}>
                                      <span>{fmt(j.monto)}</span>
                                      {j.tipo === 'anticipo' && (
                                        <span className="ml-1 text-[10px] opacity-60">A</span>
                                      )}
                                      {/* Acciones al hover */}
                                      <div className="hidden group-hover:flex absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded shadow-md gap-1 px-2 py-1 z-10 whitespace-nowrap">
                                        <button onClick={() => abrirJornal(undefined, undefined, j)}
                                          className="text-blue-600 text-[10px] hover:underline">Editar</button>
                                        <span className="text-gray-300">|</span>
                                        <button onClick={() => setEliminando({ tipo: 'jornal', id: j.id, label: `${j.tipo} del ${j.fecha}` })}
                                          className="text-red-500 text-[10px] hover:underline">Borrar</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                /* Botón + para registrar rápido */
                                <button
                                  onClick={() => abrirJornal(emp.id, dia)}
                                  className="w-7 h-7 rounded-full border border-dashed border-gray-300 text-gray-300 hover:border-gray-400 hover:text-gray-500 text-lg leading-none flex items-center justify-center mx-auto transition-colors"
                                  title={`Registrar jornal de ${emp.nombre}`}
                                >
                                  +
                                </button>
                              )}
                            </td>
                          )
                        })}

                        {/* Total a cobrar */}
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-gray-800">{fmt(aCobrar)}</p>
                          {totalA > 0 && (
                            <p className="text-xs text-orange-500">
                              {fmt(totalJ)} − {fmt(totalA)} ant.
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB EMPLEADOS ═══════════════════════════════════════════════════ */}
      {tab === 'empleados' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => abrirEmpleado()}
              className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e]">
              + Nuevo empleado
            </button>
          </div>

          {empleados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No hay empleados registrados.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jornal habitual</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total jornales</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total anticipos</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{emp.nombre}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(emp.jornal_habitual)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(emp.total_jornales)}</td>
                      <td className="px-4 py-3 text-right text-orange-500">{fmt(emp.total_anticipos)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => abrirEmpleado(emp)}
                            className="text-xs text-blue-600 hover:underline">Editar</button>
                          <button onClick={() => setEliminando({ tipo: 'empleado', id: emp.id, label: emp.nombre })}
                            className="text-xs text-red-500 hover:underline">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL JORNAL ════════════════════════════════════════════════════ */}
      {modalJornal && (
        <Modal titulo={editJornal ? 'Editar registro' : 'Registrar jornal / anticipo'} onClose={() => setModalJornal(false)}>
          <form onSubmit={guardarJornal} className="space-y-4">
            <div>
              <label className="label">Empleado <span className="text-red-500">*</span></label>
              <select value={formJornal.empleado_id}
                onChange={(e) => {
                  const emp = empleados.find(em => em.id === Number(e.target.value))
                  setFormJornal({
                    ...formJornal,
                    empleado_id: e.target.value,
                    monto: formJornal.tipo === 'jornal' ? String(emp?.jornal_habitual ?? '') : formJornal.monto,
                  })
                }}
                className="input">
                <option value="">— Seleccioná un empleado —</option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo</label>
                <select value={formJornal.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value as 'jornal' | 'anticipo'
                    const emp = empleados.find(em => em.id === Number(formJornal.empleado_id))
                    setFormJornal({
                      ...formJornal, tipo,
                      monto: tipo === 'jornal' ? String(emp?.jornal_habitual ?? formJornal.monto) : formJornal.monto,
                    })
                  }}
                  className="input">
                  <option value="jornal">Jornal</option>
                  <option value="anticipo">Anticipo</option>
                </select>
              </div>
              <div>
                <label className="label">Fecha <span className="text-red-500">*</span></label>
                <input type="date" value={formJornal.fecha}
                  onChange={(e) => setFormJornal({ ...formJornal, fecha: e.target.value })}
                  className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monto ($) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="500" value={formJornal.monto}
                  onChange={(e) => setFormJornal({ ...formJornal, monto: e.target.value })}
                  className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Obra</label>
                <select value={formJornal.obra_id}
                  onChange={(e) => setFormJornal({ ...formJornal, obra_id: e.target.value })}
                  className="input">
                  <option value="">— Sin obra —</option>
                  {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Observaciones</label>
              <input type="text" value={formJornal.observaciones}
                onChange={(e) => setFormJornal({ ...formJornal, observaciones: e.target.value })}
                className="input" placeholder="Opcional" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModalJornal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e] disabled:opacity-50">
                {guardando ? 'Guardando...' : editJornal ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL EMPLEADO ══════════════════════════════════════════════════ */}
      {modalEmpleado && (
        <Modal titulo={editEmpleado ? 'Editar empleado' : 'Nuevo empleado'} onClose={() => setModalEmpleado(false)}>
          <form onSubmit={guardarEmpleado} className="space-y-4">
            <div>
              <label className="label">Nombre completo <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={formEmpleado.nombre}
                onChange={(e) => setFormEmpleado({ ...formEmpleado, nombre: e.target.value })}
                className="input" placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className="label">Jornal habitual ($)</label>
              <input type="number" min="0" step="500" value={formEmpleado.jornal_habitual}
                onChange={(e) => setFormEmpleado({ ...formEmpleado, jornal_habitual: e.target.value })}
                className="input" placeholder="0" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModalEmpleado(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e] disabled:opacity-50">
                {guardando ? 'Guardando...' : editEmpleado ? 'Guardar cambios' : 'Crear empleado'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ CONFIRMAR ELIMINAR ═══════════════════════════════════════════════ */}
      {eliminando && (
        <ConfirmEliminar
          mensaje={`¿Mover "${eliminando.label}" a la papelera?`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setEliminando(null)}
          cargando={cargandoEliminar}
        />
      )}
    </div>
  )
}
