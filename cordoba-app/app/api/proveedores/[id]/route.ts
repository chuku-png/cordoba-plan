import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type Params = { params: { id: string } }

// GET /api/proveedores/[id] — ficha con compras y pagos
export async function GET(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)

  const proveedor = db.prepare(`
    SELECT * FROM proveedores WHERE id = ? AND deleted_at IS NULL
  `).get(id)
  if (!proveedor) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const compras = db.prepare(`
    SELECT cp.*, o.nombre AS obra_nombre
    FROM compras_proveedor cp
    LEFT JOIN obras o ON o.id = cp.obra_id
    WHERE cp.proveedor_id = ? AND cp.deleted_at IS NULL
    ORDER BY cp.fecha DESC
  `).all(id)

  const pagos = db.prepare(`
    SELECT pp.*, cp.descripcion AS compra_descripcion
    FROM pagos_proveedor pp
    LEFT JOIN compras_proveedor cp ON cp.id = pp.compra_id
    WHERE pp.proveedor_id = ? AND pp.deleted_at IS NULL
    ORDER BY pp.fecha DESC
  `).all(id)

  const resumen = db.prepare(`
    SELECT
      COALESCE(SUM(cp.monto_total), 0) AS total_compras,
      COALESCE((SELECT SUM(monto) FROM pagos_proveedor WHERE proveedor_id = ? AND deleted_at IS NULL), 0) AS total_pagado
    FROM compras_proveedor cp
    WHERE cp.proveedor_id = ? AND cp.deleted_at IS NULL
  `).get(id, id) as { total_compras: number; total_pagado: number }

  return NextResponse.json({
    ...(proveedor as object),
    compras,
    pagos,
    total_compras: resumen.total_compras,
    total_pagado:  resumen.total_pagado,
    deuda_actual:  resumen.total_compras - resumen.total_pagado,
  })
}

// PUT /api/proveedores/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const body = await req.json()
  const { nombre, telefono, condicion_pago } = body

  const exists = db.prepare('SELECT id FROM proveedores WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const campos: string[] = []
  const valores: (string | null)[] = []

  if (nombre        !== undefined) { campos.push('nombre = ?');        valores.push(nombre.trim()) }
  if (telefono      !== undefined) { campos.push('telefono = ?');      valores.push(telefono?.trim() || null) }
  if (condicion_pago !== undefined) { campos.push('condicion_pago = ?'); valores.push(condicion_pago?.trim() || null) }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  valores.push(String(id))
  db.prepare(`UPDATE proveedores SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

  const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(id)
  return NextResponse.json(proveedor)
}

// DELETE /api/proveedores/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id)
  const exists = db.prepare('SELECT id FROM proveedores WHERE id = ? AND deleted_at IS NULL').get(id)
  if (!exists) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  db.prepare(`UPDATE proveedores SET deleted_at = datetime('now','localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
