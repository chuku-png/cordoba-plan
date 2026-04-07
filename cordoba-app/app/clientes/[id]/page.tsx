'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/Modal'
import ConfirmEliminar from '@/components/ConfirmEliminar'

interface Obra {
  id: number
  nombre: string
  estado: 'activa' | 'terminada' | 'cobrada'
  presupuesto_original: number | null
  fecha_inicio: string | null
  fecha_fin: string | null
  total_cobrado: number
  adicionales_pendientes: number
}

interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  created_at: string
  obras: Obra[]
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  activa:    { label: 'Activa',    color: 'bg-green-100 text-green-700' },
  terminada: { label: 'Terminada', color: 'bg-yellow-100 text-yellow-700' },
  cobrada:   { label: 'Cobrada',   color: 'bg-blue-100 text-blue-700' },
}

const ESTADOS_OBRA = ['activa', 'terminada', 'cobrada']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function FichaClientePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const id = params.id

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cargando, setCargando] = useState(true)

  // Modal nueva obra
  const [modalObra, setModalObra] = useState(false)
  const [obraEditando, setObraEditando] = useState<Obra | null>(null)
  const [formObra, setFormObra] = useState({ nombre: '', presupuesto_original: '', fecha_inicio: '' })
  const [guardandoObra, setGuardandoObra] = useState(false)
  const [errorObra, setErrorObra] = useState('')

  // Cambio de estado inline
  const [cambiandoEstado, setCambiandoEstado] = useState<number | null>(null)

  // Eliminar obra
  const [eliminandoObra, setEliminandoObra] = useState<Obra | null>(null)
  const [cargandoEliminar, setCargandoEliminar] = useState(false)

  // Popup detalle obra
  const [obraDetalle, setObraDetalle] = useState<Obra | null>(null)
  const [detalleData, setDetalleData] = useState<{
    ingresos: {id:number;tipo:string;monto:number;fecha:string;forma_pago:string}[]
    materiales: {id:number;descripcion:string;monto_total:number;estado_pago:string;proveedor_nombre:string}[]
    adicionales: {id:number;descripcion:string;monto_total:number;monto_mano_obra:number;estado:string;fecha:string|null}[]
    presupuestos: {id:number;monto:number;estado:string;fecha_envio:string|null;notas:string|null}[]
  } | null>(null)
  const [detalleTab, setDetalleTab] = useState<'ingresos'|'materiales'|'adicionales'|'presupuestos'>('ingresos')
  const [formCobro, setFormCobro] = useState<{visible:boolean;monto:string;forma_pago:string;fecha:string;tipo:string}>({visible:false,monto:'',forma_pago:'transferencia',fecha:new Date().toISOString().slice(0,10),tipo:'pago_parcial'})
  const [guardandoCobro, setGuardandoCobro] = useState(false)

  const cargarDetalle = async (obra: Obra) => {
    const [ing, mat, adic, pres] = await Promise.all([
      fetch(`/api/ingresos?obra_id=${obra.id}`).then(r => r.json()),
      fetch(`/api/materiales?obra_id=${obra.id}`).then(r => r.json()),
      fetch(`/api/adicionales?obra_id=${obra.id}`).then(r => r.json()),
      fetch(`/api/presupuestos?obra_id=${obra.id}`).then(r => r.json()),
    ])
    setDetalleData({ ingresos: ing, materiales: mat, adicionales: adic, presupuestos: pres })
  }

  const abrirDetalle = async (obra: Obra) => {
    setObraDetalle(obra)
    setDetalleData(null)
    setDetalleTab('ingresos')
    setFormCobro({visible:false,monto:'',forma_pago:'transferencia',fecha:new Date().toISOString().slice(0,10),tipo:'pago_parcial'})
    await cargarDetalle(obra)
  }

  const registrarCobro = async () => {
    if (!obraDetalle || !formCobro.monto) return
    setGuardandoCobro(true)
    await fetch('/api/ingresos', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        obra_id: obraDetalle.id,
        cliente_id: cliente?.id,
        tipo: formCobro.tipo,
        monto: Number(formCobro.monto),
        forma_pago: formCobro.forma_pago,
        fecha: formCobro.fecha,
      }),
    })
    setFormCobro(f => ({...f, visible:false, monto:''}))
    await cargarDetalle(obraDetalle)
    const res = await fetch(`/api/clientes/${id}`)
    const clienteActualizado = await res.json()
    setCliente(clienteActualizado)
    const obraActualizada = clienteActualizado.obras?.find((o: Obra) => o.id === obraDetalle.id)
    if (obraActualizada) setObraDetalle(obraActualizada)
    setGuardandoCobro(false)
  }

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`)
    if (res.status === 404) { router.push('/clientes'); return }
    setCliente(await res.json())
    setCargando(false)
  }, [id, router])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevaObra = () => {
    setObraEditando(null)
    setFormObra({ nombre: '', presupuesto_original: '', fecha_inicio: '' })
    setErrorObra('')
    setModalObra(true)
  }

  const abrirEditarObra = (o: Obra) => {
    setObraEditando(o)
    setFormObra({
      nombre: o.nombre,
      presupuesto_original: o.presupuesto_original?.toString() ?? '',
      fecha_inicio: o.fecha_inicio ?? '',
    })
    setErrorObra('')
    setModalObra(true)
  }

  const guardarObra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formObra.nombre.trim()) { setErrorObra('El nombre es obligatorio'); return }
    setGuardandoObra(true)
    setErrorObra('')

    let res: Response
    if (obraEditando) {
      res = await fetch(`/api/obras/${obraEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formObra.nombre,
          presupuesto_original: formObra.presupuesto_original ? Number(formObra.presupuesto_original) : null,
          fecha_inicio: formObra.fecha_inicio || null,
        }),
      })
    } else {
      res = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: id,
          nombre: formObra.nombre,
          presupuesto_original: formObra.presupuesto_original ? Number(formObra.presupuesto_original) : null,
          fecha_inicio: formObra.fecha_inicio || null,
        }),
      })
    }

    if (res.ok) {
      await cargar()
      setModalObra(false)
    } else {
      const data = await res.json()
      setErrorObra(data.error ?? 'Error al guardar')
    }
    setGuardandoObra(false)
  }

  const cambiarEstado = async (obraId: number, nuevoEstado: string) => {
    setCambiandoEstado(obraId)
    await fetch(`/api/obras/${obraId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    await cargar()
    setCambiandoEstado(null)
  }

  const confirmarEliminarObra = async () => {
    if (!eliminandoObra) return
    setCargandoEliminar(true)
    await fetch(`/api/obras/${eliminandoObra.id}`, { method: 'DELETE' })
    await cargar()
    setEliminandoObra(null)
    setCargandoEliminar(false)
  }

  if (cargando) {
    return <div className="text-gray-400 text-sm p-6">Cargando...</div>
  }

  if (!cliente) return null

  const totalPresupuestado = cliente.obras.reduce((s, o) => s + (o.presupuesto_original ?? 0), 0)
  const totalCobrado = cliente.obras.reduce((s, o) => s + o.total_cobrado, 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link href="/clientes" className="hover:underline">Clientes</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 font-medium">{cliente.nombre}</span>
      </div>

      {/* Card datos del cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{cliente.nombre}</h2>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {cliente.telefono && <p>📞 {cliente.telefono}</p>}
              {cliente.email && <p>✉️ {cliente.email}</p>}
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{fmt(totalPresupuestado)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Presupuestado</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{fmt(totalCobrado)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Cobrado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Obras */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-700">
            Obras ({cliente.obras.length})
          </h3>
          <button
            onClick={abrirNuevaObra}
            className="px-3 py-1.5 bg-[#1a1a2e] text-white text-xs rounded-lg hover:bg-[#2a2a4e]"
          >
            + Nueva obra
          </button>
        </div>

        {cliente.obras.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Este cliente no tiene obras todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {cliente.obras.map((obra) => {
              const est = ESTADO_LABEL[obra.estado]
              const pendiente = (obra.presupuesto_original ?? 0) - obra.total_cobrado
              return (
                <div key={obra.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => abrirDetalle(obra)} className="font-semibold text-gray-800 hover:text-[#1a1a2e] hover:underline text-left">{obra.nombre}</button>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>
                          {est.label}
                        </span>
                        {obra.adicionales_pendientes > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {obra.adicionales_pendientes} adicional{obra.adicionales_pendientes !== 1 ? 'es' : ''} pendiente{obra.adicionales_pendientes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                        {obra.presupuesto_original && (
                          <span>Presupuesto: <strong className="text-gray-700">{fmt(obra.presupuesto_original)}</strong></span>
                        )}
                        <span>Cobrado: <strong className="text-green-600">{fmt(obra.total_cobrado)}</strong></span>
                        {obra.presupuesto_original && pendiente > 0 && (
                          <span>Pendiente: <strong className="text-orange-500">{fmt(pendiente)}</strong></span>
                        )}
                        {obra.fecha_inicio && (
                          <span>Inicio: {obra.fecha_inicio}</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Selector de estado */}
                      <select
                        value={obra.estado}
                        disabled={cambiandoEstado === obra.id}
                        onChange={(e) => cambiarEstado(obra.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]/20 bg-white"
                      >
                        {ESTADOS_OBRA.map((s) => (
                          <option key={s} value={s}>{ESTADO_LABEL[s].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => abrirEditarObra(obra)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setEliminandoObra(obra)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nueva/editar obra */}
      {modalObra && (
        <Modal
          titulo={obraEditando ? 'Editar obra' : 'Nueva obra'}
          onClose={() => setModalObra(false)}
        >
          <form onSubmit={guardarObra} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la obra <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={formObra.nombre}
                onChange={(e) => setFormObra({ ...formObra, nombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="Ej: Ampliación cocina"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto original ($)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formObra.presupuesto_original}
                onChange={(e) => setFormObra({ ...formObra, presupuesto_original: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={formObra.fecha_inicio}
                onChange={(e) => setFormObra({ ...formObra, fecha_inicio: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20"
              />
            </div>

            {errorObra && <p className="text-red-500 text-sm">{errorObra}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalObra(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoObra}
                className="px-4 py-2 text-sm bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a4e] disabled:opacity-50"
              >
                {guardandoObra ? 'Guardando...' : obraEditando ? 'Guardar cambios' : 'Crear obra'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Popup detalle obra */}
      {obraDetalle && (
        <Modal titulo={obraDetalle.nombre} onClose={() => setObraDetalle(null)} ancho="max-w-2xl">
          <div className="space-y-3">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {(['ingresos','materiales','adicionales','presupuestos'] as const).map(tab => (
                <button key={tab} onClick={() => setDetalleTab(tab)}
                  className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 transition-colors ${detalleTab===tab?'border-[#1a1a2e] text-[#1a1a2e] font-medium':'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {!detalleData ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
            ) : (
              <div className="space-y-3">

                {/* ── INGRESOS ── */}
                {detalleTab==='ingresos' && (() => {
                  const totalMateriales = detalleData.materiales.reduce((s,m)=>s+m.monto_total,0)
                  const presup = detalleData.presupuestos[0]
                  const totalPresup = presup ? presup.monto : (obraDetalle.presupuesto_original ?? 0)
                  const moPresup = Math.max(0, totalPresup - totalMateriales)

                  const cobradoMat = detalleData.ingresos.filter(i=>i.tipo==='entrega_materiales').reduce((s,i)=>s+i.monto,0)
                  const cobradoMO  = detalleData.ingresos.filter(i=>i.tipo!=='entrega_materiales').reduce((s,i)=>s+i.monto,0)
                  const pendienteMat = Math.max(0, totalMateriales - cobradoMat)
                  const pendienteMO  = Math.max(0, moPresup - cobradoMO)
                  const pendienteTotal = pendienteMat + pendienteMO

                  const montoNum = Number(formCobro.monto) || 0
                  const esPagoFinalValido = montoNum >= pendienteTotal && pendienteTotal > 0

                  return (
                    <div className="space-y-3">
                      {/* Resumen separado */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Mano de obra</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Total</span><span className="font-medium">{fmt(moPresup)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Cobrado</span><span className="text-green-600">{fmt(cobradoMO)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t border-gray-200">
                            <span className={pendienteMO>0?'text-orange-600':'text-green-700'}>Pendiente</span>
                            <span className={pendienteMO>0?'text-orange-600':'text-green-700'}>{fmt(pendienteMO)}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Materiales</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Total</span><span className="font-medium">{fmt(totalMateriales)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Cobrado</span><span className="text-green-600">{fmt(cobradoMat)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t border-gray-200">
                            <span className={pendienteMat>0?'text-orange-600':'text-green-700'}>Pendiente</span>
                            <span className={pendienteMat>0?'text-orange-600':'text-green-700'}>{fmt(pendienteMat)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Barra progreso total */}
                      {totalPresup > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{width:`${Math.min(100,(cobradoMat+cobradoMO)/totalPresup*100).toFixed(1)}%`}} />
                        </div>
                      )}
                      {/* Tabla cobros */}
                      {detalleData.ingresos.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs">
                            <tr><th className="text-left px-3 py-2">Tipo</th><th className="text-left px-3 py-2">Forma pago</th><th className="text-left px-3 py-2">Fecha</th><th className="text-right px-3 py-2">Monto</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.ingresos.map(i=>(
                              <tr key={i.id}><td className="px-3 py-2 capitalize">{i.tipo.replace(/_/g,' ')}</td><td className="px-3 py-2 text-gray-500 capitalize">{i.forma_pago}</td><td className="px-3 py-2 text-gray-500">{i.fecha}</td><td className="px-3 py-2 text-right font-medium text-green-600">{fmt(i.monto)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="text-sm text-gray-400 text-center py-3">Sin cobros registrados.</p>}
                      {/* Form registrar cobro */}
                      {formCobro.visible ? (
                        <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                          <p className="text-xs font-medium text-gray-600">Registrar cobro</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="label">Tipo</label>
                              <select className="input" value={formCobro.tipo} onChange={e=>setFormCobro(f=>({...f,tipo:e.target.value}))}>
                                <option value="anticipo">Anticipo</option>
                                <option value="entrega_materiales">Entrega materiales</option>
                                <option value="pago_parcial">Pago parcial</option>
                                {esPagoFinalValido && <option value="pago_final">Pago final</option>}
                              </select>
                              {formCobro.tipo==='pago_final' && !esPagoFinalValido && (
                                <p className="text-xs text-orange-500 mt-1">El monto debe cubrir el pendiente ({fmt(pendienteTotal)})</p>
                              )}
                            </div>
                            <div>
                              <label className="label">Forma de pago</label>
                              <select className="input" value={formCobro.forma_pago} onChange={e=>setFormCobro(f=>({...f,forma_pago:e.target.value}))}>
                                <option value="transferencia">Transferencia</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="cheque">Cheque</option>
                              </select>
                            </div>
                            <div>
                              <label className="label">Monto</label>
                              <input className="input" type="number" min="0" value={formCobro.monto} onChange={e=>setFormCobro(f=>({...f,monto:e.target.value}))} placeholder={pendienteTotal>0?String(pendienteTotal):''} />
                            </div>
                            <div>
                              <label className="label">Fecha</label>
                              <input className="input" type="date" value={formCobro.fecha} onChange={e=>setFormCobro(f=>({...f,fecha:e.target.value}))} />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100" onClick={()=>setFormCobro(f=>({...f,visible:false}))}>Cancelar</button>
                            <button className="px-3 py-1.5 text-xs bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] disabled:opacity-50" onClick={registrarCobro} disabled={guardandoCobro||!formCobro.monto}>{guardandoCobro?'Guardando...':'Guardar cobro'}</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>setFormCobro(f=>({...f,visible:true,monto:pendienteTotal>0?String(Math.round(pendienteTotal)):''}))} className="w-full py-2 text-sm border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors">
                          + Registrar cobro
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* ── MATERIALES ── */}
                {detalleTab==='materiales' && (
                  <div className="space-y-2">
                    {detalleData.materiales.length===0
                      ? <p className="text-sm text-gray-400 text-center py-6">Sin compras de materiales.</p>
                      : <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="text-left px-3 py-2">Descripción</th><th className="text-left px-3 py-2">Proveedor</th><th className="text-center px-3 py-2">Estado</th><th className="text-right px-3 py-2">Monto</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.materiales.map(m=>(
                              <tr key={m.id}><td className="px-3 py-2">{m.descripcion}</td><td className="px-3 py-2 text-gray-500">{m.proveedor_nombre}</td><td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${m.estado_pago==='pagado'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{m.estado_pago}</span></td><td className="px-3 py-2 text-right font-medium">{fmt(m.monto_total)}</td></tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold"><td colSpan={3} className="px-3 py-2 text-right text-gray-600">Total</td><td className="px-3 py-2 text-right">{fmt(detalleData.materiales.reduce((s,m)=>s+m.monto_total,0))}</td></tr>
                          </tbody>
                        </table>
                    }
                    <Link href={`/materiales?obra_id=${obraDetalle.id}`} className="flex items-center justify-center gap-1 py-2 text-xs text-[#1a1a2e] hover:underline">
                      Ver materiales de esta obra →
                    </Link>
                  </div>
                )}

                {/* ── ADICIONALES ── */}
                {detalleTab==='adicionales' && (
                  <div className="space-y-2">
                    {detalleData.adicionales.length===0
                      ? <p className="text-sm text-gray-400 text-center py-6">Sin adicionales.</p>
                      : <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="text-left px-3 py-2">Descripción</th><th className="text-left px-3 py-2">Fecha</th><th className="text-center px-3 py-2">Estado</th><th className="text-right px-3 py-2">Monto</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.adicionales.map(a=>(
                              <tr key={a.id}><td className="px-3 py-2">{a.descripcion}</td><td className="px-3 py-2 text-gray-500">{a.fecha??'—'}</td><td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${a.estado==='cobrado'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>{a.estado}</span></td><td className="px-3 py-2 text-right font-medium">{fmt(a.monto_total)}</td></tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold"><td colSpan={3} className="px-3 py-2 text-right text-gray-600">Total</td><td className="px-3 py-2 text-right">{fmt(detalleData.adicionales.reduce((s,a)=>s+a.monto_total,0))}</td></tr>
                          </tbody>
                        </table>
                    }
                  </div>
                )}

                {/* ── PRESUPUESTOS ── */}
                {detalleTab==='presupuestos' && (
                  <div className="space-y-2">
                    {detalleData.presupuestos.length===0
                      ? <p className="text-sm text-gray-400 text-center py-6">Sin presupuestos.</p>
                      : <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="text-left px-3 py-2">Fecha envío</th><th className="text-center px-3 py-2">Estado</th><th className="text-left px-3 py-2">Notas</th><th className="text-right px-3 py-2">Monto</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.presupuestos.map(p=>(
                              <tr key={p.id}><td className="px-3 py-2 text-gray-500">{p.fecha_envio??'—'}</td><td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${{aceptado:'bg-green-100 text-green-700',rechazado:'bg-red-100 text-red-700',enviado:'bg-blue-100 text-blue-700'}[p.estado]??'bg-gray-100 text-gray-600'}`}>{p.estado.replace(/_/g,' ')}</span></td><td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{p.notas??'—'}</td><td className="px-3 py-2 text-right font-medium">{fmt(p.monto)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                    }
                    <Link href="/presupuestos" className="flex items-center justify-center gap-1 py-2 text-xs text-[#1a1a2e] hover:underline">
                      Ver todos los presupuestos →
                    </Link>
                  </div>
                )}

              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmar eliminar obra */}
      {eliminandoObra && (
        <ConfirmEliminar
          mensaje={`¿Mover la obra "${eliminandoObra.nombre}" a la papelera?`}
          onConfirmar={confirmarEliminarObra}
          onCancelar={() => setEliminandoObra(null)}
          cargando={cargandoEliminar}
        />
      )}
    </div>
  )
}
