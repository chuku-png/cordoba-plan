import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const now = new Date()
  const mes  = String(now.getMonth() + 1).padStart(2, '0')
  const anio = String(now.getFullYear())

  // Ingresos del mes actual
  const { total_ingresos } = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) AS total_ingresos
    FROM ingresos
    WHERE deleted_at IS NULL
      AND strftime('%m', fecha) = ?
      AND strftime('%Y', fecha) = ?
  `).get(mes, anio) as { total_ingresos: number }

  // Gastos del mes actual (fijos + variables + jornales)
  const { total_gastos_fijos } = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) AS total_gastos_fijos
    FROM gastos_fijos
    WHERE deleted_at IS NULL
      AND mes = ?
      AND anio = ?
  `).get(Number(mes), Number(anio)) as { total_gastos_fijos: number }

  const { total_gastos_variables } = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) AS total_gastos_variables
    FROM gastos_variables
    WHERE deleted_at IS NULL
      AND strftime('%m', fecha) = ?
      AND strftime('%Y', fecha) = ?
  `).get(mes, anio) as { total_gastos_variables: number }

  const { total_jornales_mes } = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) AS total_jornales_mes
    FROM jornales
    WHERE deleted_at IS NULL
      AND strftime('%m', fecha) = ?
      AND strftime('%Y', fecha) = ?
  `).get(mes, anio) as { total_jornales_mes: number }

  const total_gastos = total_gastos_fijos + total_gastos_variables + total_jornales_mes

  // Obras activas
  const { obras_activas } = db.prepare(`
    SELECT COUNT(*) AS obras_activas
    FROM obras
    WHERE deleted_at IS NULL AND estado = 'activa'
  `).get() as { obras_activas: number }

  // Jornales a pagar esta semana (lunes a domingo de la semana actual)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon
  const lunes = new Date(now); lunes.setDate(now.getDate() - dayOfWeek)
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const { jornales_semana, anticipos_semana } = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'jornal'  THEN monto ELSE 0 END), 0) AS jornales_semana,
      COALESCE(SUM(CASE WHEN tipo = 'anticipo' THEN monto ELSE 0 END), 0) AS anticipos_semana
    FROM jornales
    WHERE deleted_at IS NULL
      AND fecha >= ? AND fecha <= ?
  `).get(fmt(lunes), fmt(domingo)) as { jornales_semana: number; anticipos_semana: number }
  const a_pagar_semana = Math.max(0, jornales_semana - anticipos_semana)

  // Deuda total con proveedores
  const { deuda_proveedores_raw } = db.prepare(`
    SELECT
      COALESCE(
        (SELECT SUM(monto_total) FROM compras_proveedor WHERE deleted_at IS NULL), 0
      ) -
      COALESCE(
        (SELECT SUM(monto) FROM pagos_proveedor WHERE deleted_at IS NULL), 0
      ) AS deuda_proveedores_raw
  `).get() as { deuda_proveedores_raw: number }
  const deuda_proveedores = Math.max(0, deuda_proveedores_raw)

  // Adicionales pendientes de cobro
  const { adicionales_pendientes } = db.prepare(`
    SELECT COUNT(*) AS adicionales_pendientes
    FROM adicionales
    WHERE deleted_at IS NULL AND estado = 'pendiente'
  `).get() as { adicionales_pendientes: number }

  const { monto_adicionales_pendientes } = db.prepare(`
    SELECT COALESCE(SUM(monto_mano_obra + COALESCE(monto_material, 0)), 0) AS monto_adicionales_pendientes
    FROM adicionales
    WHERE deleted_at IS NULL AND estado = 'pendiente'
  `).get() as { monto_adicionales_pendientes: number }

  // Presupuestos enviados sin respuesta
  const { presupuestos_sin_respuesta } = db.prepare(`
    SELECT COUNT(*) AS presupuestos_sin_respuesta
    FROM presupuestos
    WHERE deleted_at IS NULL AND (estado = 'sin_respuesta' OR estado = 'enviado')
  `).get() as { presupuestos_sin_respuesta: number }

  return NextResponse.json({
    total_ingresos,
    total_gastos,
    resultado_neto: total_ingresos - total_gastos,
    obras_activas,
    a_pagar_semana,
    deuda_proveedores,
    adicionales_pendientes,
    monto_adicionales_pendientes,
    presupuestos_sin_respuesta,
    mes: `${mes}/${anio}`,
    semana: `${fmt(lunes)} al ${fmt(domingo)}`,
  })
}
