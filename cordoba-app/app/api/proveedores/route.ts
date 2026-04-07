import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/proveedores — lista con deuda calculada (compras - pagos)
export async function GET() {
  const proveedores = db.prepare(`
    SELECT
      p.*,
      COALESCE(SUM(cp.monto_total), 0)   AS total_compras,
      COALESCE(SUM(pp.monto), 0)          AS total_pagado,
      COALESCE(SUM(cp.monto_total), 0)
        - COALESCE(SUM(pp.monto), 0)      AS deuda_actual,
      COUNT(DISTINCT cp.id)               AS cantidad_compras
    FROM proveedores p
    LEFT JOIN compras_proveedor cp ON cp.proveedor_id = p.id AND cp.deleted_at IS NULL
    LEFT JOIN pagos_proveedor   pp ON pp.proveedor_id = p.id AND pp.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
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
