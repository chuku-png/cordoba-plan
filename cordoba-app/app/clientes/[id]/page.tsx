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

  // Proveedores para forms del popup
  const [proveedores, setProveedores] = useState<{id:number;nombre:string}[]>([])

  // Popup detalle obra
  const [obraDetalle, setObraDetalle] = useState<Obra | null>(null)
  const [detalleData, setDetalleData] = useState<{
    ingresos: {id:number;tipo:string;monto:number;fecha:string;forma_pago:string}[]
    materiales: {id:number;descripcion:string;monto_total:number;estado_pago:string;proveedor_nombre:string}[]
    adicionales: {id:number;descripcion:string;monto_total:number;monto_mano_obra:number;monto_material:number;estado:string;fecha:string|null}[]
    presupuestos: {id:number;monto:number;estado:string;fecha_envio:string|null;notas:string|null}[]
  } | null>(null)
  const [detalleTab, setDetalleTab] = useState<'ingresos'|'materiales'|'adicionales'|'presupuestos'>('ingresos')

  // Forms cobro — separados por tipo
  const hoy = new Date().toISOString().slice(0,10)
  const [formCobroMO,  setFormCobroMO]  = useState({visible:false,monto:'',forma_pago:'transferencia',fecha:hoy,tipo:'pago_parcial'})
  const [formCobroMat, setFormCobroMat] = useState({visible:false,monto:'',forma_pago:'transferencia',fecha:hoy})
  const [guardandoCobro, setGuardandoCobro] = useState(false)

  // Forms nuevo material / adicional / presupuesto
  const [formMat,  setFormMat]  = useState({visible:false,proveedor_id:'',descripcion:'',monto_total:'',fecha:hoy})
  const [formAdic, setFormAdic] = useState({visible:false,descripcion:'',monto_mano_obra:'',monto_material:'',proveedor_id:'',fecha:hoy})
  const [formPres, setFormPres] = useState({visible:false,monto:'',estado:'sin_respuesta',fecha_envio:hoy,notas:''})
  const [guardandoForm, setGuardandoForm] = useState(false)

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
    const h = new Date().toISOString().slice(0,10)
    setFormCobroMO({visible:false,monto:'',forma_pago:'transferencia',fecha:h,tipo:'pago_parcial'})
    setFormCobroMat({visible:false,monto:'',forma_pago:'transferencia',fecha:h})
    setFormMat({visible:false,proveedor_id:'',descripcion:'',monto_total:'',fecha:h})
    setFormAdic({visible:false,descripcion:'',monto_mano_obra:'',monto_material:'',proveedor_id:'',fecha:h})
    setFormPres({visible:false,monto:'',estado:'sin_respuesta',fecha_envio:h,notas:''})
    await cargarDetalle(obra)
  }

  const refrescarCliente = async () => {
    const res = await fetch(`/api/clientes/${id}`)
    const clienteActualizado = await res.json()
    setCliente(clienteActualizado)
    const obraActualizada = clienteActualizado.obras?.find((o: Obra) => o.id === obraDetalle?.id)
    if (obraActualizada) setObraDetalle(obraActualizada)
  }

  const registrarCobroMO = async () => {
    if (!obraDetalle || !formCobroMO.monto) return
    setGuardandoCobro(true)
    await fetch('/api/ingresos', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ obra_id: obraDetalle.id, cliente_id: cliente?.id, tipo: formCobroMO.tipo, monto: Number(formCobroMO.monto), forma_pago: formCobroMO.forma_pago, fecha: formCobroMO.fecha }),
    })
    setFormCobroMO(f => ({...f, visible:false, monto:''}))
    await cargarDetalle(obraDetalle)
    await refrescarCliente()
    setGuardandoCobro(false)
  }

  const registrarCobroMat = async () => {
    if (!obraDetalle || !formCobroMat.monto) return
    setGuardandoCobro(true)
    await fetch('/api/ingresos', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ obra_id: obraDetalle.id, cliente_id: cliente?.id, tipo: 'entrega_materiales', monto: Number(formCobroMat.monto), forma_pago: formCobroMat.forma_pago, fecha: formCobroMat.fecha }),
    })
    setFormCobroMat(f => ({...f, visible:false, monto:''}))
    await cargarDetalle(obraDetalle)
    await refrescarCliente()
    setGuardandoCobro(false)
  }

  const guardarMaterial = async () => {
    if (!obraDetalle || !formMat.proveedor_id || !formMat.descripcion.trim() || !formMat.monto_total) return
    setGuardandoForm(true)
    await fetch('/api/materiales', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ proveedor_id: Number(formMat.proveedor_id), obra_id: obraDetalle.id, descripcion: formMat.descripcion.trim(), monto_total: Number(formMat.monto_total), fecha: formMat.fecha }),
    })
    setFormMat(f => ({...f, visible:false, proveedor_id:'', descripcion:'', monto_total:''}))
    await cargarDetalle(obraDetalle)
    setGuardandoForm(false)
  }

  const guardarAdicional = async () => {
    if (!obraDetalle || !formAdic.descripcion.trim()) return
    setGuardandoForm(true)
    await fetch('/api/adicionales', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ obra_id: obraDetalle.id, descripcion: formAdic.descripcion.trim(), monto_mano_obra: Number(formAdic.monto_mano_obra)||0, monto_material: Number(formAdic.monto_material)||0, proveedor_id: formAdic.proveedor_id ? Number(formAdic.proveedor_id) : null, fecha: formAdic.fecha }),
    })
    setFormAdic(f => ({...f, visible:false, descripcion:'', monto_mano_obra:'', monto_material:'', proveedor_id:''}))
    await cargarDetalle(obraDetalle)
    await refrescarCliente()
    setGuardandoForm(false)
  }

  const guardarPresupuesto = async () => {
    if (!obraDetalle || !formPres.monto) return
    setGuardandoForm(true)
    await fetch('/api/presupuestos', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ obra_id: obraDetalle.id, monto: Number(formPres.monto), estado: formPres.estado, fecha_envio: formPres.fecha_envio || null, notas: formPres.notas.trim() || null }),
    })
    setFormPres(f => ({...f, visible:false, monto:'', notas:''}))
    await cargarDetalle(obraDetalle)
    setGuardandoForm(false)
  }

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`)
    if (res.status === 404) { router.push('/clientes'); return }
    setCliente(await res.json())
    setCargando(false)
  }, [id, router])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { fetch('/api/proveedores').then(r=>r.json()).then(setProveedores) }, [])

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
            {obraEditando && (
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
            )}
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
                  const montoMONum = Number(formCobroMO.monto) || 0
                  const esPagoFinalValido = montoMONum >= pendienteTotal && pendienteTotal > 0

                  return (
                    <div className="space-y-3">
                      {/* Resumen */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Mano de obra</p>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Total</span><span className="font-medium">{fmt(moPresup)}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Cobrado</span><span className="text-green-600">{fmt(cobradoMO)}</span></div>
                          <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t border-gray-200">
                            <span className={pendienteMO>0?'text-orange-600':'text-green-700'}>Pendiente</span>
                            <span className={pendienteMO>0?'text-orange-600':'text-green-700'}>{fmt(pendienteMO)}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Materiales</p>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Total</span><span className="font-medium">{fmt(totalMateriales)}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Cobrado</span><span className="text-green-600">{fmt(cobradoMat)}</span></div>
                          <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t border-gray-200">
                            <span className={pendienteMat>0?'text-orange-600':'text-green-700'}>Pendiente</span>
                            <span className={pendienteMat>0?'text-orange-600':'text-green-700'}>{fmt(pendienteMat)}</span>
                          </div>
                        </div>
                      </div>
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

                      {/* Botones cobro — dos separados */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Cobro mano de obra */}
                        {formCobroMO.visible ? (
                          <div className="col-span-2 border border-blue-200 rounded-lg p-3 space-y-2 bg-blue-50">
                            <p className="text-xs font-medium text-blue-700">Cobro — Mano de obra</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="label">Tipo</label>
                                <select className="input" value={formCobroMO.tipo} onChange={e=>setFormCobroMO(f=>({...f,tipo:e.target.value}))}>
                                  <option value="anticipo">Anticipo</option>
                                  <option value="pago_parcial">Pago parcial</option>
                                  {esPagoFinalValido && <option value="pago_final">Pago final</option>}
                                </select>
                              </div>
                              <div>
                                <label className="label">Forma de pago</label>
                                <select className="input" value={formCobroMO.forma_pago} onChange={e=>setFormCobroMO(f=>({...f,forma_pago:e.target.value}))}>
                                  <option value="transferencia">Transferencia</option>
                                  <option value="efectivo">Efectivo</option>
                                  <option value="cheque">Cheque</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Monto</label>
                                <input className="input" type="number" min="0" value={formCobroMO.monto} onChange={e=>setFormCobroMO(f=>({...f,monto:e.target.value}))} placeholder={pendienteMO>0?String(Math.round(pendienteMO)):''} />
                              </div>
                              <div>
                                <label className="label">Fecha</label>
                                <input className="input" type="date" value={formCobroMO.fecha} onChange={e=>setFormCobroMO(f=>({...f,fecha:e.target.value}))} />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100" onClick={()=>setFormCobroMO(f=>({...f,visible:false}))}>Cancelar</button>
                              <button className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50" onClick={registrarCobroMO} disabled={guardandoCobro||!formCobroMO.monto}>{guardandoCobro?'Guardando...':'Guardar'}</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>{setFormCobroMat(f=>({...f,visible:false}));setFormCobroMO(f=>({...f,visible:true,monto:pendienteMO>0?String(Math.round(pendienteMO)):''}))}}
                            className="py-2 text-xs border-2 border-dashed border-blue-200 rounded-lg text-blue-400 hover:border-blue-500 hover:text-blue-600 transition-colors">
                            + Cobro mano de obra
                          </button>
                        )}

                        {/* Cobro materiales */}
                        {formCobroMat.visible ? (
                          <div className="col-span-2 border border-orange-200 rounded-lg p-3 space-y-2 bg-orange-50">
                            <p className="text-xs font-medium text-orange-700">Cobro — Materiales</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="label">Forma de pago</label>
                                <select className="input" value={formCobroMat.forma_pago} onChange={e=>setFormCobroMat(f=>({...f,forma_pago:e.target.value}))}>
                                  <option value="transferencia">Transferencia</option>
                                  <option value="efectivo">Efectivo</option>
                                  <option value="cheque">Cheque</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Fecha</label>
                                <input className="input" type="date" value={formCobroMat.fecha} onChange={e=>setFormCobroMat(f=>({...f,fecha:e.target.value}))} />
                              </div>
                              <div className="col-span-2">
                                <label className="label">Monto</label>
                                <input className="input" type="number" min="0" value={formCobroMat.monto} onChange={e=>setFormCobroMat(f=>({...f,monto:e.target.value}))} placeholder={pendienteMat>0?String(Math.round(pendienteMat)):''} />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100" onClick={()=>setFormCobroMat(f=>({...f,visible:false}))}>Cancelar</button>
                              <button className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50" onClick={registrarCobroMat} disabled={guardandoCobro||!formCobroMat.monto}>{guardandoCobro?'Guardando...':'Guardar'}</button>
                            </div>
                          </div>
                        ) : (
                          !formCobroMO.visible && (
                            <button onClick={()=>{setFormCobroMO(f=>({...f,visible:false}));setFormCobroMat(f=>({...f,visible:true,monto:pendienteMat>0?String(Math.round(pendienteMat)):''}))}}
                              className="py-2 text-xs border-2 border-dashed border-orange-200 rounded-lg text-orange-400 hover:border-orange-500 hover:text-orange-600 transition-colors">
                              + Cobro materiales
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* ── MATERIALES ── */}
                {detalleTab==='materiales' && (
                  <div className="space-y-2">
                    {detalleData.materiales.length===0
                      ? <p className="text-sm text-gray-400 text-center py-4">Sin compras de materiales.</p>
                      : <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="text-left px-3 py-2">Descripción</th><th className="text-left px-3 py-2">Proveedor</th><th className="text-center px-3 py-2">Estado</th><th className="text-right px-3 py-2">Monto</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.materiales.map(m=>(
                              <tr key={m.id}><td className="px-3 py-2">{m.descripcion}</td><td className="px-3 py-2 text-gray-500">{m.proveedor_nombre}</td><td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${m.estado_pago==='pagado'?'bg-green-100 text-green-700':m.estado_pago==='parcial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{m.estado_pago}</span></td><td className="px-3 py-2 text-right font-medium">{fmt(m.monto_total)}</td></tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold"><td colSpan={3} className="px-3 py-2 text-right text-gray-600">Total</td><td className="px-3 py-2 text-right">{fmt(detalleData.materiales.reduce((s,m)=>s+m.monto_total,0))}</td></tr>
                          </tbody>
                        </table>
                    }
                    {/* Form nuevo material */}
                    {formMat.visible ? (
                      <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                        <p className="text-xs font-medium text-gray-600">Nueva compra de materiales</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Proveedor *</label>
                            <select className="input" value={formMat.proveedor_id} onChange={e=>setFormMat(f=>({...f,proveedor_id:e.target.value}))}>
                              <option value="">Seleccionar...</option>
                              {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Fecha</label>
                            <input className="input" type="date" value={formMat.fecha} onChange={e=>setFormMat(f=>({...f,fecha:e.target.value}))} />
                          </div>
                          <div className="col-span-2">
                            <label className="label">Descripción *</label>
                            <input className="input" value={formMat.descripcion} onChange={e=>setFormMat(f=>({...f,descripcion:e.target.value}))} placeholder="Ej: Cemento, arena, ladrillos" />
                          </div>
                          <div className="col-span-2">
                            <label className="label">Monto total *</label>
                            <input className="input" type="number" min="0" value={formMat.monto_total} onChange={e=>setFormMat(f=>({...f,monto_total:e.target.value}))} />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100" onClick={()=>setFormMat(f=>({...f,visible:false}))}>Cancelar</button>
                          <button className="px-3 py-1.5 text-xs bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] disabled:opacity-50" onClick={guardarMaterial} disabled={guardandoForm||!formMat.proveedor_id||!formMat.descripcion||!formMat.monto_total}>{guardandoForm?'Guardando...':'Guardar'}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>setFormMat(f=>({...f,visible:true}))} className="w-full py-2 text-xs border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors">
                        + Agregar compra de materiales
                      </button>
                    )}
                    <Link href={`/materiales?obra_id=${obraDetalle.id}`} className="flex items-center justify-center gap-1 py-1 text-xs text-[#1a1a2e] hover:underline">
                      Ver en página de materiales →
                    </Link>
                  </div>
                )}

                {/* ── ADICIONALES ── */}
                {detalleTab==='adicionales' && (
                  <div className="space-y-2">
                    {detalleData.adicionales.length===0
                      ? <p className="text-sm text-gray-400 text-center py-4">Sin adicionales.</p>
                      : <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="text-left px-3 py-2">Descripción</th><th className="text-right px-3 py-2">MO</th><th className="text-right px-3 py-2">Mat.</th><th className="text-center px-3 py-2">Estado</th><th className="text-right px-3 py-2">Total</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.adicionales.map(a=>(
                              <tr key={a.id}>
                                <td className="px-3 py-2">{a.descripcion}</td>
                                <td className="px-3 py-2 text-right text-gray-500 text-xs">{fmt(a.monto_mano_obra)}</td>
                                <td className="px-3 py-2 text-right text-gray-500 text-xs">{fmt(a.monto_material)}</td>
                                <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${a.estado==='cobrado'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>{a.estado}</span></td>
                                <td className="px-3 py-2 text-right font-medium">{fmt(a.monto_total)}</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold"><td colSpan={4} className="px-3 py-2 text-right text-gray-600">Total</td><td className="px-3 py-2 text-right">{fmt(detalleData.adicionales.reduce((s,a)=>s+a.monto_total,0))}</td></tr>
                          </tbody>
                        </table>
                    }
                    {/* Form nuevo adicional */}
                    {formAdic.visible ? (
                      <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                        <p className="text-xs font-medium text-gray-600">Nuevo adicional</p>
                        <div className="col-span-2">
                          <label className="label">Descripción *</label>
                          <input className="input" value={formAdic.descripcion} onChange={e=>setFormAdic(f=>({...f,descripcion:e.target.value}))} placeholder="Ej: Cambio cañería imprevisto" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Mano de obra</label>
                            <input className="input" type="number" min="0" value={formAdic.monto_mano_obra} onChange={e=>setFormAdic(f=>({...f,monto_mano_obra:e.target.value}))} placeholder="0" />
                          </div>
                          <div>
                            <label className="label">Materiales</label>
                            <input className="input" type="number" min="0" value={formAdic.monto_material} onChange={e=>setFormAdic(f=>({...f,monto_material:e.target.value}))} placeholder="0" />
                          </div>
                          <div>
                            <label className="label">Proveedor (opcional)</label>
                            <select className="input" value={formAdic.proveedor_id} onChange={e=>setFormAdic(f=>({...f,proveedor_id:e.target.value}))}>
                              <option value="">Sin proveedor</option>
                              {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Fecha</label>
                            <input className="input" type="date" value={formAdic.fecha} onChange={e=>setFormAdic(f=>({...f,fecha:e.target.value}))} />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100" onClick={()=>setFormAdic(f=>({...f,visible:false}))}>Cancelar</button>
                          <button className="px-3 py-1.5 text-xs bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] disabled:opacity-50" onClick={guardarAdicional} disabled={guardandoForm||!formAdic.descripcion}>{guardandoForm?'Guardando...':'Guardar'}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>setFormAdic(f=>({...f,visible:true}))} className="w-full py-2 text-xs border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors">
                        + Agregar adicional
                      </button>
                    )}
                  </div>
                )}

                {/* ── PRESUPUESTOS ── */}
                {detalleTab==='presupuestos' && (
                  <div className="space-y-2">
                    {detalleData.presupuestos.length===0
                      ? <p className="text-sm text-gray-400 text-center py-4">Sin presupuestos.</p>
                      : <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="text-left px-3 py-2">Fecha envío</th><th className="text-center px-3 py-2">Estado</th><th className="text-left px-3 py-2">Notas</th><th className="text-right px-3 py-2">Monto</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {detalleData.presupuestos.map(p=>(
                              <tr key={p.id}><td className="px-3 py-2 text-gray-500">{p.fecha_envio??'—'}</td><td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${{aceptado:'bg-green-100 text-green-700',rechazado:'bg-red-100 text-red-700',enviado:'bg-blue-100 text-blue-700'}[p.estado]??'bg-gray-100 text-gray-600'}`}>{p.estado.replace(/_/g,' ')}</span></td><td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{p.notas??'—'}</td><td className="px-3 py-2 text-right font-medium">{fmt(p.monto)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                    }
                    {/* Form nuevo presupuesto */}
                    {formPres.visible ? (
                      <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                        <p className="text-xs font-medium text-gray-600">Nuevo presupuesto</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Monto *</label>
                            <input className="input" type="number" min="0" value={formPres.monto} onChange={e=>setFormPres(f=>({...f,monto:e.target.value}))} />
                          </div>
                          <div>
                            <label className="label">Estado</label>
                            <select className="input" value={formPres.estado} onChange={e=>setFormPres(f=>({...f,estado:e.target.value}))}>
                              <option value="sin_respuesta">Sin respuesta</option>
                              <option value="enviado">Enviado</option>
                              <option value="aceptado">Aceptado</option>
                              <option value="rechazado">Rechazado</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Fecha envío</label>
                            <input className="input" type="date" value={formPres.fecha_envio} onChange={e=>setFormPres(f=>({...f,fecha_envio:e.target.value}))} />
                          </div>
                          <div>
                            <label className="label">Notas</label>
                            <input className="input" value={formPres.notas} onChange={e=>setFormPres(f=>({...f,notas:e.target.value}))} placeholder="Opcional" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100" onClick={()=>setFormPres(f=>({...f,visible:false}))}>Cancelar</button>
                          <button className="px-3 py-1.5 text-xs bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] disabled:opacity-50" onClick={guardarPresupuesto} disabled={guardandoForm||!formPres.monto}>{guardandoForm?'Guardando...':'Guardar'}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>setFormPres(f=>({...f,visible:true}))} className="w-full py-2 text-xs border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-colors">
                        + Agregar presupuesto
                      </button>
                    )}
                    <Link href="/presupuestos" className="flex items-center justify-center gap-1 py-1 text-xs text-[#1a1a2e] hover:underline">
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
