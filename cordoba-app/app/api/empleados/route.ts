import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/empleados — lista empleados activos con resumen de deuda
export async function GET() {
  const empleados = db.prepare(`
    SELECT
      e.*,
      COALESCE(SUM(CASE WHEN j.tipo = 'jornal'   AND j.deleted_at IS NULL THEN j.monto ELSE 0 END), 0) AS total_jornales,
      COALESCE(SUM(CASE WHEN j.tipo = 'anticipo'  AND j.deleted_at IS NULL THEN j.monto ELSE 0 END), 0) AS total_anticipos
    FROM empleados e
    LEFT JOIN jornales j ON j.empleado_id = e.id
    WHERE e.deleted_at IS NULL
    GROUP BY e.id
    ORDER BY e.nombre ASC
  `).all()

  return NextResponse.json(empleados)
}

// POST /api/empleados — da de alta un empleado
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, jornal_habitual } = body

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO empleados (nombre, jornal_habitual) VALUES (?, ?)
  `).run(nombre.trim(), jornal_habitual ? Number(jornal_habitual) : 0)

  const empleado = db.prepare('SELECT * FROM empleados WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(empleado, { status: 201 })
}
