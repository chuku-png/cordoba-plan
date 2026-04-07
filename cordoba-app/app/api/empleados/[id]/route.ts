import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/empleados/[id] — edita nombre o jornal habitual
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { nombre, jornal_habitual } = body

  const exists = db.prepare('SELECT id FROM empleados WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | number)[] = []

  if (nombre         !== undefined) { campos.push('nombre = ?');          valores.push(nombre.trim()) }
  if (jornal_habitual !== undefined) { campos.push('jornal_habitual = ?'); valores.push(Number(jornal_habitual)) }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(id)
  db.prepare(`UPDATE empleados SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const empleado = db.prepare('SELECT * FROM empleados WHERE id = ?').get(id)
  return NextResponse.json(empleado)
}

// DELETE /api/empleados/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM empleados WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })

  db.prepare(`UPDATE empleados SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
