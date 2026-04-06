/**
 * Script de seed — carga datos de ejemplo en la base de datos.
 * Uso: npx tsx scripts/seed.ts
 */
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// El seed crea su propia conexión para poder correr independiente de Next.js
const DB_PATH = path.resolve('./data/cordoba.db')
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Crear tablas antes de insertar
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
    telefono TEXT, email TEXT, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS obras (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL,
    nombre TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'activa',
    presupuesto_original REAL, fecha_inicio DATE, fecha_fin DATE,
    deleted_at DATETIME, created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
    telefono TEXT, condicion_pago TEXT DEFAULT 'contado',
    deleted_at DATETIME, created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
    jornal_habitual REAL NOT NULL DEFAULT 0, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, obra_id INTEGER, cliente_id INTEGER,
    tipo TEXT NOT NULL, monto REAL NOT NULL, forma_pago TEXT NOT NULL,
    fecha DATE NOT NULL, observaciones TEXT, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS gastos_fijos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, concepto TEXT NOT NULL,
    mes INTEGER NOT NULL, anio INTEGER NOT NULL, monto REAL NOT NULL,
    estado TEXT NOT NULL DEFAULT 'sin_pagar', fecha_pago DATE,
    deleted_at DATETIME, created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS gastos_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT, concepto TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Varios', monto REAL NOT NULL,
    fecha DATE NOT NULL, observaciones TEXT, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS jornales (
    id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER NOT NULL,
    obra_id INTEGER, fecha DATE NOT NULL, monto REAL NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'jornal', observaciones TEXT,
    deleted_at DATETIME, created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS compras_proveedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER NOT NULL,
    obra_id INTEGER, descripcion TEXT NOT NULL, monto_total REAL NOT NULL DEFAULT 0,
    estado_pago TEXT NOT NULL DEFAULT 'pendiente', fecha DATE NOT NULL,
    archivo_path TEXT, resumen_json TEXT, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS pagos_proveedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER NOT NULL,
    compra_id INTEGER, monto REAL NOT NULL, fecha DATE NOT NULL,
    observaciones TEXT, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, obra_id INTEGER,
    monto REAL NOT NULL, estado TEXT NOT NULL DEFAULT 'sin_respuesta',
    fecha_envio DATE, archivo_path TEXT, notas TEXT, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS adicionales (
    id INTEGER PRIMARY KEY AUTOINCREMENT, obra_id INTEGER NOT NULL,
    proveedor_id INTEGER, descripcion TEXT NOT NULL,
    monto_mano_obra REAL DEFAULT 0, monto_material REAL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente', fecha DATE, deleted_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entidad_tipo TEXT NOT NULL,
    entidad_id INTEGER NOT NULL, nombre_archivo TEXT NOT NULL,
    archivo_path TEXT NOT NULL, tipo TEXT NOT NULL DEFAULT 'otro',
    procesado_ia INTEGER NOT NULL DEFAULT 0, resumen_ia TEXT,
    deleted_at DATETIME, created_at DATETIME DEFAULT (datetime('now','localtime'))
  );
`)

// ── Clientes ──────────────────────────────────────────────
const insertCliente = db.prepare(
  `INSERT OR IGNORE INTO clientes (id, nombre, telefono, email) VALUES (?, ?, ?, ?)`
)
insertCliente.run(1, 'Ramón Gutiérrez', '351-555-0101', 'ramon@email.com')
insertCliente.run(2, 'Laura Pereyra', '351-555-0202', null)
insertCliente.run(3, 'Municipalidad Zona Norte', '351-555-0303', 'obras@municipalidad.ar')

// ── Obras ─────────────────────────────────────────────────
const insertObra = db.prepare(
  `INSERT OR IGNORE INTO obras (id, cliente_id, nombre, estado, presupuesto_original, fecha_inicio) VALUES (?, ?, ?, ?, ?, ?)`
)
insertObra.run(1, 1, 'Ampliación cocina y baño', 'activa', 1850000, '2026-02-10')
insertObra.run(2, 2, 'Refacción completa PH', 'activa', 4200000, '2026-03-01')
insertObra.run(3, 3, 'Construcción vereda y cordón', 'terminada', 980000, '2026-01-15')

// ── Proveedores ───────────────────────────────────────────
const insertProveedor = db.prepare(
  `INSERT OR IGNORE INTO proveedores (id, nombre, telefono, condicion_pago) VALUES (?, ?, ?, ?)`
)
insertProveedor.run(1, 'Corralón El Toro', '351-444-1111', '30_dias')
insertProveedor.run(2, 'Distribuidora Cemento Norte', '351-444-2222', 'contado')

// ── Empleados ─────────────────────────────────────────────
const insertEmpleado = db.prepare(
  `INSERT OR IGNORE INTO empleados (id, nombre, jornal_habitual) VALUES (?, ?, ?)`
)
insertEmpleado.run(1, 'Carlos Méndez', 18000)
insertEmpleado.run(2, 'Diego Flores', 16500)
insertEmpleado.run(3, 'Martín Sosa', 16500)

// ── Ingresos ──────────────────────────────────────────────
const insertIngreso = db.prepare(
  `INSERT OR IGNORE INTO ingresos (id, obra_id, cliente_id, tipo, monto, forma_pago, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`
)
insertIngreso.run(1, 1, 1, 'anticipo', 500000, 'transferencia', '2026-02-10')
insertIngreso.run(2, 1, 1, 'pago_parcial', 400000, 'efectivo', '2026-03-05')
insertIngreso.run(3, 2, 2, 'anticipo', 1200000, 'transferencia', '2026-03-01')
insertIngreso.run(4, 3, 3, 'pago_final', 980000, 'transferencia', '2026-02-28')

// ── Gastos fijos ──────────────────────────────────────────
const insertGastoFijo = db.prepare(
  `INSERT OR IGNORE INTO gastos_fijos (id, concepto, mes, anio, monto, estado, fecha_pago) VALUES (?, ?, ?, ?, ?, ?, ?)`
)
insertGastoFijo.run(1, 'Alquiler depósito', 4, 2026, 120000, 'pagado', '2026-04-01')
insertGastoFijo.run(2, 'Contador', 4, 2026, 45000, 'sin_pagar', null)
insertGastoFijo.run(3, 'Seguro herramientas', 4, 2026, 28000, 'sin_pagar', null)

// ── Gastos variables ──────────────────────────────────────
const insertGastoVar = db.prepare(
  `INSERT OR IGNORE INTO gastos_variables (id, concepto, categoria, monto, fecha) VALUES (?, ?, ?, ?, ?)`
)
insertGastoVar.run(1, 'Combustible camioneta', 'Transporte', 35000, '2026-04-02')
insertGastoVar.run(2, 'Amoladora nueva', 'Herramientas', 89000, '2026-04-03')

// ── Jornales ──────────────────────────────────────────────
const insertJornal = db.prepare(
  `INSERT OR IGNORE INTO jornales (id, empleado_id, obra_id, fecha, monto, tipo) VALUES (?, ?, ?, ?, ?, ?)`
)
insertJornal.run(1, 1, 1, '2026-03-31', 18000, 'jornal')
insertJornal.run(2, 2, 1, '2026-03-31', 16500, 'jornal')
insertJornal.run(3, 1, 1, '2026-04-01', 18000, 'jornal')
insertJornal.run(4, 3, 2, '2026-04-01', 16500, 'jornal')
insertJornal.run(5, 1, 1, '2026-04-02', 9000, 'anticipo')

// ── Compras proveedor ─────────────────────────────────────
const insertCompra = db.prepare(
  `INSERT OR IGNORE INTO compras_proveedor (id, proveedor_id, obra_id, descripcion, monto_total, estado_pago, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`
)
insertCompra.run(1, 1, 1, 'Hierros y cemento inicio obra', 320000, 'pagado', '2026-02-12')
insertCompra.run(2, 1, 2, 'Cerámicos y adhesivo', 185000, 'pendiente', '2026-03-10')
insertCompra.run(3, 2, 1, 'Arena y cascote', 78000, 'pendiente', '2026-03-20')

// ── Presupuestos ──────────────────────────────────────────
const insertPresupuesto = db.prepare(
  `INSERT OR IGNORE INTO presupuestos (id, obra_id, monto, estado, fecha_envio) VALUES (?, ?, ?, ?, ?)`
)
insertPresupuesto.run(1, 1, 1850000, 'aceptado', '2026-02-05')
insertPresupuesto.run(2, 2, 4200000, 'aceptado', '2026-02-20')

// ── Adicionales ───────────────────────────────────────────
const insertAdicional = db.prepare(
  `INSERT OR IGNORE INTO adicionales (id, obra_id, descripcion, monto_mano_obra, monto_material, estado, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`
)
insertAdicional.run(1, 1, 'Cambio cañería cloacal imprevisto', 45000, 22000, 'pendiente', '2026-03-15')
insertAdicional.run(2, 2, 'Colocación durlock habitación extra', 60000, 35000, 'pendiente', '2026-03-28')

console.log('✓ Seed completado — base de datos cargada con datos de ejemplo')
db.close()
