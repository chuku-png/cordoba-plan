import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DATABASE_PATH ?? './data/cordoba.db'
const BACKUP_PATH = process.env.BACKUP_PATH ?? './data/backups'

export function crearBackup(): string {
  // Asegurar que el directorio existe
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.mkdirSync(BACKUP_PATH, { recursive: true })
  }

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const nombre = `cordoba_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.db`
  const destino = path.join(BACKUP_PATH, nombre)

  fs.copyFileSync(DB_PATH, destino)

  // Limpiar backups viejos: mantener solo los últimos 30
  const archivos = fs
    .readdirSync(BACKUP_PATH)
    .filter(f => f.startsWith('cordoba_') && f.endsWith('.db'))
    .sort()

  if (archivos.length > 30) {
    const sobran = archivos.slice(0, archivos.length - 30)
    for (const archivo of sobran) {
      fs.unlinkSync(path.join(BACKUP_PATH, archivo))
    }
  }

  return destino
}

export function listarBackups(): { nombre: string; tamaño: number; fecha: string }[] {
  if (!fs.existsSync(BACKUP_PATH)) return []

  return fs
    .readdirSync(BACKUP_PATH)
    .filter(f => f.startsWith('cordoba_') && f.endsWith('.db'))
    .sort()
    .reverse()
    .map(nombre => {
      const stat = fs.statSync(path.join(BACKUP_PATH, nombre))
      return {
        nombre,
        tamaño: stat.size,
        fecha: stat.mtime.toISOString(),
      }
    })
}
