import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/materiales?obra_id=1
// Devuelve compras_proveedor que tienen archivo_path o resumen_json
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const obraId = searchParams.get('obra_id')

  let sql = `
    SELECT
      cp.*,
      p.nombre  AS proveedor_nombre,
      o.nombre  AS obra_nombre,
      COALESCE(
        (SELECT SUM(pp.monto) FROM pagos_proveedor pp
         WHERE pp.compra_id = cp.id AND pp.deleted_at IS NULL), 0
      ) AS total_pagado
    FROM compras_proveedor cp
    JOIN proveedores p ON p.id = cp.proveedor_id
    LEFT JOIN obras o   ON o.id = cp.obra_id
    WHERE cp.deleted_at IS NULL
  `
  const args: number[] = []

  if (obraId) { sql += ' AND cp.obra_id = ?'; args.push(Number(obraId)) }

  sql += ' ORDER BY cp.fecha DESC'

  const materiales = db.prepare(sql).all(...args)
  return NextResponse.json(materiales)
}

// POST /api/materiales — vincula un archivo a una compra_proveedor existente o crea una nueva
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { compra_id, proveedor_id, obra_id, descripcion, monto_total, fecha, archivo_path, resumen_json } = body

  // Si se pasa compra_id, actualizamos la compra existente con archivo/resumen
  if (compra_id) {
    const exists = db.prepare('SELECT id FROM compras_proveedor WHERE id = ? AND deleted_at IS NULL').get(Number(compra_id))
    if (!exists) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

    const campos: string[] = []
    const valores: (string | number | null)[] = []

    if (archivo_path !== undefined) { campos.push('archivo_path = ?'); valores.push(archivo_path || null) }
    if (resumen_json !== undefined) { campos.push('resumen_json = ?'); valores.push(resumen_json || null) }

    if (campos.length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

    valores.push(Number(compra_id))
    db.prepare(`UPDATE compras_proveedor SET ${campos.join(', ')} WHERE id = ?`).run(...valores)

    const compra = db.prepare(`
      SELECT cp.*, p.nombre AS proveedor_nombre, o.nombre AS obra_nombre
      FROM compras_proveedor cp
      JOIN proveedores p ON p.id = cp.proveedor_id
      LEFT JOIN obras o  ON o.id = cp.obra_id
      WHERE cp.id = ?
    `).get(Number(compra_id))

    return NextResponse.json(compra)
  }

  // Si no hay compra_id, crear una nueva compra con el archivo vinculado
  if (!proveedor_id || !descripcion?.trim() || !monto_total || !fecha) {
    return NextResponse.json(
      { error: 'proveedor_id, descripcion, monto_total y fecha son obligatorios para crear nueva compra' },
      { status: 400 }
    )
  }

  const provExiste = db.prepare('SELECT id FROM proveedores WHERE id = ? AND deleted_at IS NULL').get(Number(proveedor_id))
  if (!provExiste) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const result = db.prepare(`
    INSERT INTO compras_proveedor
      (proveedor_id, obra_id, descripcion, monto_total, estado_pago, fecha, archivo_path, resumen_json)
    VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?)
  `).run(
    Number(proveedor_id),
    obra_id ? Number(obra_id) : null,
    descripcion.trim(),
    Number(monto_total),
    fecha,
    archivo_path || null,
    resumen_json || null
  )

  const compra = db.prepare(`
    SELECT cp.*, p.nombre AS proveedor_nombre, o.nombre AS obra_nombre
    FROM compras_proveedor cp
    JOIN proveedores p ON p.id = cp.proveedor_id
    LEFT JOIN obras o  ON o.id = cp.obra_id
    WHERE cp.id = ?
  `).get(result.lastInsertRowid)

  return NextResponse.json(compra, { status: 201 })
}
