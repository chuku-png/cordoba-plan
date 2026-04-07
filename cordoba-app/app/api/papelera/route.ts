import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// Tablas con soft delete y su nombre para mostrar
const TABLAS = [
  { tabla: 'clientes',           label: 'Clientes',              campo_nombre: 'nombre' },
  { tabla: 'obras',              label: 'Obras',                 campo_nombre: 'nombre' },
  { tabla: 'adicionales',        label: 'Adicionales',           campo_nombre: 'descripcion' },
  { tabla: 'ingresos',           label: 'Ingresos',              campo_nombre: 'tipo' },
  { tabla: 'gastos_fijos',       label: 'Gastos fijos',          campo_nombre: 'concepto' },
  { tabla: 'gastos_variables',   label: 'Gastos variables',      campo_nombre: 'concepto' },
  { tabla: 'empleados',          label: 'Empleados',             campo_nombre: 'nombre' },
  { tabla: 'jornales',           label: 'Jornales',              campo_nombre: 'tipo' },
  { tabla: 'proveedores',        label: 'Proveedores',           campo_nombre: 'nombre' },
  { tabla: 'compras_proveedor',  label: 'Compras a proveedor',   campo_nombre: 'descripcion' },
  { tabla: 'pagos_proveedor',    label: 'Pagos a proveedor',     campo_nombre: 'observaciones' },
  { tabla: 'presupuestos',       label: 'Presupuestos',          campo_nombre: 'notas' },
]

// GET /api/papelera — devuelve todos los registros eliminados agrupados por tabla
export async function GET() {
  const grupos: Record<string, { label: string; items: Record<string, unknown>[] }> = {}

  for (const { tabla, label, campo_nombre } of TABLAS) {
    const rows = db.prepare(
      `SELECT id, ${campo_nombre} AS nombre, deleted_at FROM ${tabla} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    ).all() as { id: number; nombre: string | null; deleted_at: string }[]

    if (rows.length > 0) {
      grupos[tabla] = { label, items: rows.map(r => ({ ...r, tabla })) }
    }
  }

  return NextResponse.json(grupos)
}

// POST /api/papelera — restaurar un registro
// Body: { tabla: 'clientes', id: 1 }
export async function POST(req: NextRequest) {
  const { tabla, id } = await req.json()

  const def = TABLAS.find(t => t.tabla === tabla)
  if (!def) return NextResponse.json({ error: 'Tabla no válida' }, { status: 400 })
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const exists = db.prepare(`SELECT id FROM ${tabla} WHERE id = ? AND deleted_at IS NOT NULL`).get(Number(id))
  if (!exists) return NextResponse.json({ error: 'Registro no encontrado en la papelera' }, { status: 404 })

  db.prepare(`UPDATE ${tabla} SET deleted_at = NULL WHERE id = ?`).run(Number(id))
  return NextResponse.json({ ok: true })
}

// DELETE /api/papelera — vaciar papelera (eliminar definitivamente todos los registros con deleted_at)
export async function DELETE() {
  for (const { tabla } of TABLAS) {
    db.prepare(`DELETE FROM ${tabla} WHERE deleted_at IS NOT NULL`).run()
  }
  return NextResponse.json({ ok: true })
}
