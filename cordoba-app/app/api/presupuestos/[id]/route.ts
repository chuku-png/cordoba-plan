import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// PUT /api/presupuestos/[id] — editar / cambiar estado
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { monto, fecha_envio, estado, obra_id, archivo_path, notas } = body

  const exists = db.prepare('SELECT id FROM presupuestos WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | number | null)[] = []

  if (monto       !== undefined) { campos.push('monto = ?');       valores.push(Number(monto)) }
  if (fecha_envio !== undefined) { campos.push('fecha_envio = ?'); valores.push(fecha_envio || null) }
  if (estado      !== undefined) { campos.push('estado = ?');      valores.push(estado) }
  if (obra_id     !== undefined) { campos.push('obra_id = ?');     valores.push(obra_id ? Number(obra_id) : null) }
  if (archivo_path !== undefined) { campos.push('archivo_path = ?'); valores.push(archivo_path || null) }
  if (notas       !== undefined) { campos.push('notas = ?');       valores.push(notas?.trim() || null) }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(id)
  db.prepare(`UPDATE presupuestos SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const presupuesto = db.prepare(`
    SELECT pr.*, o.nombre AS obra_nombre, c.id AS cliente_id, c.nombre AS cliente_nombre
    FROM presupuestos pr
    LEFT JOIN obras o ON o.id = pr.obra_id
    LEFT JOIN clientes c ON c.id = o.cliente_id
    WHERE pr.id = ?
  `).get(id)

  return NextResponse.json(presupuesto)
}

// DELETE /api/presupuestos/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM presupuestos WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

  db.prepare(`UPDATE presupuestos SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
