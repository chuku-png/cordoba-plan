import db from './db'

export function initDB() {
  db.exec(`
    -- ─────────────────────────────────────────────
    -- GRUPO 1: Clientes y obras
    -- ─────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS clientes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT    NOT NULL,
      telefono    TEXT,
      email       TEXT,
      deleted_at  DATETIME,
      created_at  DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS obras (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id          INTEGER NOT NULL REFERENCES clientes(id),
      nombre              TEXT    NOT NULL,
      estado              TEXT    NOT NULL DEFAULT 'activa'
                            CHECK(estado IN ('activa','terminada','cobrada')),
      presupuesto_original REAL,
      fecha_inicio        DATE,
      fecha_fin           DATE,
      deleted_at          DATETIME,
      created_at          DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS adicionales (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id         INTEGER NOT NULL REFERENCES obras(id),
      proveedor_id    INTEGER REFERENCES proveedores(id),
      descripcion     TEXT    NOT NULL,
      monto_mano_obra REAL    DEFAULT 0,
      monto_material  REAL    DEFAULT 0,
      estado          TEXT    NOT NULL DEFAULT 'pendiente'
                        CHECK(estado IN ('pendiente','cobrado')),
      fecha           DATE,
      deleted_at      DATETIME,
      created_at      DATETIME DEFAULT (datetime('now','localtime'))
    );

    -- ─────────────────────────────────────────────
    -- GRUPO 2: Finanzas
    -- ─────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS ingresos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id       INTEGER REFERENCES obras(id),
      cliente_id    INTEGER REFERENCES clientes(id),
      tipo          TEXT NOT NULL
                      CHECK(tipo IN ('anticipo','entrega_materiales','pago_parcial','pago_final')),
      monto         REAL NOT NULL,
      forma_pago    TEXT NOT NULL
                      CHECK(forma_pago IN ('transferencia','efectivo','cheque')),
      fecha         DATE NOT NULL,
      observaciones TEXT,
      deleted_at    DATETIME,
      created_at    DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS gastos_fijos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      concepto    TEXT    NOT NULL,
      mes         INTEGER NOT NULL CHECK(mes BETWEEN 1 AND 12),
      anio        INTEGER NOT NULL,
      monto       REAL    NOT NULL,
      estado      TEXT    NOT NULL DEFAULT 'sin_pagar'
                    CHECK(estado IN ('sin_pagar','pagado')),
      fecha_pago  DATE,
      deleted_at  DATETIME,
      created_at  DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS gastos_variables (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      concepto      TEXT NOT NULL,
      categoria     TEXT NOT NULL DEFAULT 'Varios',
      monto         REAL NOT NULL,
      fecha         DATE NOT NULL,
      observaciones TEXT,
      deleted_at    DATETIME,
      created_at    DATETIME DEFAULT (datetime('now','localtime'))
    );

    -- ─────────────────────────────────────────────
    -- GRUPO 3: Empleados
    -- ─────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS empleados (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre          TEXT NOT NULL,
      jornal_habitual REAL NOT NULL DEFAULT 0,
      deleted_at      DATETIME,
      created_at      DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS jornales (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id   INTEGER NOT NULL REFERENCES empleados(id),
      obra_id       INTEGER REFERENCES obras(id),
      fecha         DATE NOT NULL,
      monto         REAL NOT NULL,
      tipo          TEXT NOT NULL DEFAULT 'jornal'
                      CHECK(tipo IN ('jornal','anticipo')),
      observaciones TEXT,
      deleted_at    DATETIME,
      created_at    DATETIME DEFAULT (datetime('now','localtime'))
    );

    -- ─────────────────────────────────────────────
    -- GRUPO 4: Proveedores y materiales
    -- ─────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS proveedores (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre          TEXT NOT NULL,
      telefono        TEXT,
      condicion_pago  TEXT DEFAULT 'contado',
      deleted_at      DATETIME,
      created_at      DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS compras_proveedor (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
      obra_id      INTEGER REFERENCES obras(id),
      descripcion  TEXT NOT NULL,
      monto_total  REAL NOT NULL DEFAULT 0,
      estado_pago  TEXT NOT NULL DEFAULT 'pendiente'
                     CHECK(estado_pago IN ('pendiente','pagado')),
      fecha        DATE NOT NULL,
      archivo_path TEXT,
      resumen_json TEXT,
      deleted_at   DATETIME,
      created_at   DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS pagos_proveedor (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
      compra_id    INTEGER REFERENCES compras_proveedor(id),
      monto        REAL NOT NULL,
      fecha        DATE NOT NULL,
      observaciones TEXT,
      deleted_at   DATETIME,
      created_at   DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS presupuestos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id      INTEGER REFERENCES obras(id),
      monto        REAL NOT NULL,
      estado       TEXT NOT NULL DEFAULT 'sin_respuesta'
                     CHECK(estado IN ('enviado','aceptado','rechazado','sin_respuesta')),
      fecha_envio  DATE,
      archivo_path TEXT,
      notas        TEXT,
      deleted_at   DATETIME,
      created_at   DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      entidad_tipo    TEXT NOT NULL
                        CHECK(entidad_tipo IN ('cliente','obra','proveedor','presupuesto')),
      entidad_id      INTEGER NOT NULL,
      nombre_archivo  TEXT NOT NULL,
      archivo_path    TEXT NOT NULL,
      tipo            TEXT NOT NULL DEFAULT 'otro'
                        CHECK(tipo IN ('excel_materiales','pdf_presupuesto','foto','otro')),
      procesado_ia    INTEGER NOT NULL DEFAULT 0,
      resumen_ia      TEXT,
      deleted_at      DATETIME,
      created_at      DATETIME DEFAULT (datetime('now','localtime'))
    );
  `)
}
