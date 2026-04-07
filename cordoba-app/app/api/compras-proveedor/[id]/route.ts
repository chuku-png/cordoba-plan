import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/compras-proveedor/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { descripcion, monto_total, estado_pago, fecha, obra_id, archivo_path, resumen_json } = body

  const exists = db.prepare('SELECT id FROM compras_proveedor WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (descripcion   !== undefined) { campos.push('descripcion = ?');   valores.push(descripcion.trim()) }
  if (monto_total   !== undefined) { campos.push('monto_total = ?');   valores.push(Number(monto_total)) }
  if (estado_pago   !== undefined) { campos.push('estado_pago = ?');   valores.push(estado_pago) }
  if (fecha         !== undefined) { campos.push('fecha = ?');         valores.push(fecha) }
  if (obra_id       !== undefined) { campos.push('obra_id = ?');       valores.push(obra_id ? Number(obra_id) : null) }
  if (archivo_path  !== undefined) { campos.push('archivo_path = ?');  valores.push(archivo_path || null) }
  if (resumen_json  !== undefined) { campos.push('resumen_json = ?');  valores.push(resumen_json || null) }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(id)
  db.prepare(`UPDATE compras_proveedor SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const compra = db.prepare('SELECT * FROM compras_proveedor WHERE id = ?').get(id)
  return NextResponse.json(compra)
}

// DELETE /api/compras-proveedor/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM compras_proveedor WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

  db.prepare(`UPDATE compras_proveedor SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
