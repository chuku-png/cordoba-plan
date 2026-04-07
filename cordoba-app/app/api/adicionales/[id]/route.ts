import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/adicionales/[id] — edita o marca como cobrado
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { descripcion, monto_mano_obra, monto_material, estado, fecha, proveedor_id } = body

  const exists = db.prepare('SELECT id FROM adicionales WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) {
    return NextResponse.json({ error: 'Adicional no encontrado' }, { status: 404 })
  }

  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion.trim()) }
  if (monto_mano_obra !== undefined) { campos.push('monto_mano_obra = ?'); valores.push(monto_mano_obra) }
  if (monto_material !== undefined) { campos.push('monto_material = ?'); valores.push(monto_material) }
  if (estado !== undefined) { campos.push('estado = ?'); valores.push(estado) }
  if (fecha !== undefined) { campos.push('fecha = ?'); valores.push(fecha || null) }
  if (proveedor_id !== undefined) { campos.push('proveedor_id = ?'); valores.push(proveedor_id ? Number(proveedor_id) : null) }

  if (campos.length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  valores.push(id)
  db.prepare(`UPDATE adicionales SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const adicional = db.prepare('SELECT * FROM adicionales WHERE id = ?').get(id)
  return NextResponse.json(adicional)
}

// DELETE /api/adicionales/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)

  const exists = db.prepare('SELECT id FROM adicionales WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) {
    return NextResponse.json({ error: 'Adicional no encontrado' }, { status: 404 })
  }

  db.prepare(`UPDATE adicionales SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
