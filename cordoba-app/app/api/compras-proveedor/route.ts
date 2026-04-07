import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/compras-proveedor?proveedor_id=1&obra_id=2
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const proveedorId = searchParams.get('proveedor_id')
  const obraId      = searchParams.get('obra_id')

  let sql = `
    SELECT
      cp.*,
      p.nombre AS proveedor_nombre,
      o.nombre AS obra_nombre,
      COALESCE(
        (SELECT SUM(pp.monto) FROM pagos_proveedor pp
         WHERE pp.compra_id = cp.id AND pp.deleted_at IS NULL), 0
      ) AS total_pagado_compra
    FROM compras_proveedor cp
    JOIN proveedores p ON p.id = cp.proveedor_id
    LEFT JOIN obras  o ON o.id = cp.obra_id
    WHERE cp.deleted_at IS NULL
  `
  const args: number[] = []

  if (proveedorId) { sql += ' AND cp.proveedor_id = ?'; args.push(Number(proveedorId)) }
  if (obraId)      { sql += ' AND cp.obra_id = ?';      args.push(Number(obraId)) }

  sql += ' ORDER BY cp.fecha DESC'

  const compras = db.prepare(sql).all(...args)
  return NextResponse.json(compras)
}

// POST /api/compras-proveedor
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { proveedor_id, obra_id, descripcion, monto_total, estado_pago, fecha, archivo_path, resumen_json } = body

  if (!proveedor_id || !descripcion?.trim() || !monto_total || !fecha) {
    return NextResponse.json(
      { error: 'proveedor_id, descripcion, monto_total y fecha son obligatorios' },
      { status: 400 }
    )
  }

  const provExiste = db.prepare('SELECT id FROM proveedores WHERE id = ? AND deleted_at IS NULL').get(Number(proveedor_id))
  if (!provExiste) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const result = db.prepare(`
    INSERT INTO compras_proveedor
      (proveedor_id, obra_id, descripcion, monto_total, estado_pago, fecha, archivo_path, resumen_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(proveedor_id),
    obra_id ? Number(obra_id) : null,
    descripcion.trim(),
    Number(monto_total),
    estado_pago || 'pendiente',
    fecha,
    archivo_path || null,
    resumen_json || null
  )

  const compra = db.prepare(`
    SELECT cp.*, p.nombre AS proveedor_nombre, o.nombre AS obra_nombre
    FROM compras_proveedor cp
    JOIN proveedores p ON p.id = cp.proveedor_id
    LEFT JOIN obras  o ON o.id = cp.obra_id
    WHERE cp.id = ?
  `).get(result.lastInsertRowid)

  return NextResponse.json(compra, { status: 201 })
}
