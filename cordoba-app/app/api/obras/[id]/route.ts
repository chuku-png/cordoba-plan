import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/obras/[id] — edita obra (nombre, estado, presupuesto, fechas)
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { nombre, estado, presupuesto_original, fecha_inicio, fecha_fin } = body

  const exists = db.prepare('SELECT id FROM obras WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) {
    return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
  }

  const estadosValidos = ['activa', 'terminada', 'cobrada']
  if (estado && !estadosValidos.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  // Solo actualiza los campos que vienen en el body
  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (nombre !== undefined) { campos.push('nombre = ?'); valores.push(nombre.trim()) }
  if (estado !== undefined) { campos.push('estado = ?'); valores.push(estado) }
  if (presupuesto_original !== undefined) { campos.push('presupuesto_original = ?'); valores.push(presupuesto_original) }
  if (fecha_inicio !== undefined) { campos.push('fecha_inicio = ?'); valores.push(fecha_inicio || null) }
  if (fecha_fin !== undefined) { campos.push('fecha_fin = ?'); valores.push(fecha_fin || null) }

  if (campos.length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  valores.push(id)
  db.prepare(`UPDATE obras SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const obra = db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
  return NextResponse.json(obra)
}

// DELETE /api/obras/[id] — soft delete en cascada (obra → ingresos/adicionales/presupuestos)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)

  const exists = db.prepare('SELECT id FROM obras WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) {
    return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
  }

  const now = "datetime('now','localtime')"

  db.transaction(() => {
    db.prepare(`UPDATE ingresos      SET deleted_at = ${now} WHERE obra_id = ? AND deleted_at IS NULL`).run(id)
    db.prepare(`UPDATE adicionales   SET deleted_at = ${now} WHERE obra_id = ? AND deleted_at IS NULL`).run(id)
    db.prepare(`UPDATE presupuestos  SET deleted_at = ${now} WHERE obra_id = ? AND deleted_at IS NULL`).run(id)
    db.prepare(`UPDATE compras_proveedor SET deleted_at = ${now} WHERE obra_id = ? AND deleted_at IS NULL`).run(id)
    db.prepare(`UPDATE obras         SET deleted_at = ${now} WHERE id = ?`).run(id)
  })()

  return NextResponse.json({ ok: true })
}
