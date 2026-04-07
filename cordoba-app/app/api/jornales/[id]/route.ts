import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/jornales/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { obra_id, fecha, monto, tipo, observaciones } = body

  const exists = db.prepare('SELECT id FROM jornales WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Jornal no encontrado' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (obra_id       !== undefined) { campos.push('obra_id = ?');       valores.push(obra_id ? Number(obra_id) : null) }
  if (fecha         !== undefined) { campos.push('fecha = ?');         valores.push(fecha) }
  if (monto         !== undefined) { campos.push('monto = ?');         valores.push(Number(monto)) }
  if (tipo          !== undefined) { campos.push('tipo = ?');          valores.push(tipo) }
  if (observaciones !== undefined) { campos.push('observaciones = ?'); valores.push(observaciones?.trim() || null) }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(id)
  db.prepare(`UPDATE jornales SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const jornal = db.prepare('SELECT * FROM jornales WHERE id = ?').get(id)
  return NextResponse.json(jornal)
}

// DELETE /api/jornales/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM jornales WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Jornal no encontrado' }, { status: 404 })

  db.prepare(`UPDATE jornales SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
