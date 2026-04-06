import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve('./data/cordoba.db')

// Garantizar que el directorio data/ existe
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Singleton: reutiliza la misma conexión durante toda la vida del proceso
const db: Database.Database = new Database(DB_PATH)

// WAL mode: mejora rendimiento en lecturas concurrentes
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export default db
