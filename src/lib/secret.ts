import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR, ensureDirs } from './paths';

let cached: string | null = null;
/** Clave para firmar sesiones y enlaces. Viene de AUTH_SECRET o se genera una vez y se guarda en la carpeta de datos. */
export function getSecret(): string {
    if (cached) return cached;
    if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16) return (cached = process.env.AUTH_SECRET);
    ensureDirs();
    const f = path.join(DATA_DIR, '.auth_secret');
    if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
    return (cached = fs.readFileSync(f, 'utf8').trim());
}
