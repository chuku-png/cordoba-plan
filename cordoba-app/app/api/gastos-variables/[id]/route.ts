import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/gastos-variables/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { concepto, categoria, monto, fecha, observaciones } = body

  const exists = db.prepare('SELECT id FROM gastos_variables WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (concepto      !== undefined) { campos.push('concepto = ?');      valores.push(concepto.trim()) }
  if (categoria     !== undefined) { campos.push('categoria = ?');     valores.push(categoria?.trim() || 'Varios') }
  if (monto         !== undefined) { campos.push('monto = ?');         valores.push(Number(monto)) }
  if (fecha         !== undefined) { campos.push('fecha = ?');         valores.push(fecha) }
  if (observaciones !== undefined) { campos.push('observaciones = ?'); valores.push(observaciones?.trim() || null) }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(id)
  db.prepare(`UPDATE gastos_variables SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const gasto = db.prepare('SELECT * FROM gastos_variables WHERE id = ?').get(id)
  return NextResponse.json(gasto)
}

// DELETE /api/gastos-variables/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM gastos_variables WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

  db.prepare(`UPDATE gastos_variables SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
