import path from 'path';
import fs from 'fs';

/** Carpeta de datos (base, fotos, copias de seguridad, clave secreta). En el servidor: /data */
export const DATA_DIR = path.resolve(process.env.DATA_DIR || process.cwd());
export const DB_PATH = path.resolve(process.env.DATABASE_PATH || path.join(DATA_DIR, 'nozieres.db'));
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export function ensureDirs() {
    for (const d of [DATA_DIR, UPLOADS_DIR, BACKUPS_DIR]) {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    }
}
