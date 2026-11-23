import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from './db';
import { UPLOADS_DIR, ensureDirs } from './paths';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const MAX_BYTES = 12 * 1024 * 1024;

export type Categoria = 'foto_frente' | 'foto_trasera' | 'foto_lateral_izq' | 'foto_lateral_der' | 'foto_tablero' | 'foto_salida' | 'presupuesto_pdf' | 'firma' | 'otro';

/** Guarda un archivo en la carpeta PRIVADA de datos (no es accesible por URL directa) y lo registra. */
export async function guardarArchivo(file: File, categoria: Categoria, ref: { ordenId?: number | null; turnoId?: number | null }, usuarioId?: number | null) {
    if (!file || file.size === 0) return null;
    if (file.size > MAX_BYTES) throw new Error(`El archivo "${file.name}" es muy pesado (máximo 12 MB).`);
    const mime = file.type || '';
    const ext = EXT[mime];
    if (!ext) throw new Error('Sólo se aceptan fotos (JPG/PNG/WEBP) y PDF.');
    if (categoria === 'presupuesto_pdf' && ext !== 'pdf') throw new Error('El presupuesto tiene que ser un PDF.');
    return guardarBuffer(Buffer.from(await file.arrayBuffer()), ext, mime, file.name, categoria, ref, usuarioId);
}

export function guardarBuffer(buf: Buffer, ext: string, mime: string, nombre: string, categoria: Categoria, ref: { ordenId?: number | null; turnoId?: number | null }, usuarioId?: number | null) {
    ensureDirs();
    const now = new Date();
    const sub = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true });
    const rel = path.join(sub, `${crypto.randomUUID()}.${ext}`);
    fs.writeFileSync(path.join(UPLOADS_DIR, rel), buf);
    const r = db.prepare(`INSERT INTO archivos (orden_id, turno_id, categoria, nombre, ruta, mime, bytes, subido_por) VALUES (?,?,?,?,?,?,?,?)`)
        .run(ref.ordenId ?? null, ref.turnoId ?? null, categoria, nombre.slice(0, 120), rel, mime, buf.length, usuarioId ?? null);
    return Number(r.lastInsertRowid);
}

export function dataUrlAPng(dataUrl: string): Buffer | null {
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
    if (!m) return null;
    const buf = Buffer.from(m[1], 'base64');
    return buf.length > 0 && buf.length < 2 * 1024 * 1024 ? buf : null;
}

export function listarArchivos(where: { ordenId?: number; turnoId?: number }) {
    if (where.ordenId) return db.prepare('SELECT id, categoria, nombre, mime, fecha FROM archivos WHERE orden_id = ? ORDER BY id').all(where.ordenId) as { id: number; categoria: string; nombre: string; mime: string; fecha: string }[];
    return db.prepare('SELECT id, categoria, nombre, mime, fecha FROM archivos WHERE turno_id = ? ORDER BY id').all(where.turnoId) as { id: number; categoria: string; nombre: string; mime: string; fecha: string }[];
}

export function rutaAbsoluta(rel: string) {
    const abs = path.resolve(UPLOADS_DIR, rel);
    if (!abs.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) throw new Error('ruta inválida');
    return abs;
}
