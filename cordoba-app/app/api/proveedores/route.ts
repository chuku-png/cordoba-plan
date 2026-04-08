import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/proveedores — lista con deuda calculada (compras - pagos)
export async function GET() {
  const proveedores = db.prepare(`
    SELECT
      p.*,
      COALESCE((SELECT SUM(cp.monto_total) FROM compras_proveedor cp WHERE cp.proveedor_id = p.id AND cp.deleted_at IS NULL), 0) AS total_compras,
      COALESCE((SELECT SUM(pp.monto)       FROM pagos_proveedor   pp WHERE pp.proveedor_id = p.id AND pp.deleted_at IS NULL), 0) AS total_pagado,
      COALESCE((SELECT SUM(cp.monto_total) FROM compras_proveedor cp WHERE cp.proveedor_id = p.id AND cp.deleted_at IS NULL), 0)
        - COALESCE((SELECT SUM(pp.monto)   FROM pagos_proveedor   pp WHERE pp.proveedor_id = p.id AND pp.deleted_at IS NULL), 0) AS deuda_actual,
      (SELECT COUNT(*) FROM compras_proveedor cp WHERE cp.proveedor_id = p.id AND cp.deleted_at IS NULL) AS cantidad_compras
    FROM proveedores p
    WHERE p.deleted_at IS NULL
    ORDER BY deuda_actual DESC, p.nombre ASC
  `).all()

  return NextResponse.json(proveedores)
}

// POST /api/proveedores
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, telefono, condicion_pago } = body

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO proveedores (nombre, telefono, condicion_pago)
    VALUES (?, ?, ?)
  `).run(nombre.trim(), telefono?.trim() || null, condicion_pago?.trim() || 'contado')

  const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(proveedor, { status: 201 })
}
