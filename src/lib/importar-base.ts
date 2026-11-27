import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import db from './db';
import { BACKUPS_DIR, DATA_DIR } from './paths';

/**
 * Importa SOLO lo nuevo de la base vieja (nozieres.db del sistema anterior) al Hub.
 * - No borra ni pisa nada: sólo agrega órdenes, vehículos, clientes y puntos que todavía no están.
 * - Se puede correr las veces que haga falta: lo ya importado se reconoce y se saltea.
 * - Antes de aplicar hace una copia de seguridad de la base del Hub.
 */

export interface ResultadoImportacion {
    ok: boolean; aplicado: boolean; error?: string;
    ordenes_nuevas: number; ordenes_ya_estaban: number;
    clientes_nuevos: number; vehiculos_nuevos: number; titulares_cambiados: number;
    puntos_movimientos: number; puntos_total: number;
    desde?: string; hasta?: string; porSucursal: Record<string, number>;
    avisos: string[]; backup?: string;
}

const normName = (s: string | null) => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normPlate = (s: string | null) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const validDni = (d: string | null) => { const x = (d || '').replace(/\D/g, ''); return x.length >= 7 && x.length <= 8 && new Set(x).size > 1 ? x : null; };
const normTel = (s: string | null) => (s || '').replace(/\D/g, '').slice(-8);

export const RUTA_PENDIENTE = path.join(DATA_DIR, 'importar', 'pendiente.db');

export function guardarPendiente(buf: Buffer) {
    fs.mkdirSync(path.dirname(RUTA_PENDIENTE), { recursive: true });
    for (const ext of ['', '-wal', '-shm']) { try { fs.unlinkSync(RUTA_PENDIENTE + ext); } catch { /* no existía */ } }
    fs.writeFileSync(RUTA_PENDIENTE, buf);
}

const colsDe = (d: Database.Database, schema: string, t: string) =>
    (d.prepare(`PRAGMA ${schema}.table_info("${t}")`).all() as { name: string }[]).map(c => c.name);

export function importarDelta(rutaVieja: string, aplicar: boolean): ResultadoImportacion {
    const res: ResultadoImportacion = {
        ok: false, aplicado: false, ordenes_nuevas: 0, ordenes_ya_estaban: 0, clientes_nuevos: 0, vehiculos_nuevos: 0,
        titulares_cambiados: 0, puntos_movimientos: 0, puntos_total: 0, porSucursal: {}, avisos: [],
    };
    // Copia de trabajo de la base vieja (el archivo subido nunca se toca)
    const tmp = path.join(DATA_DIR, 'importar', `trabajo-${Date.now()}.db`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.copyFileSync(rutaVieja, tmp);
    let viejo: Database.Database | null = null;
    try {
        viejo = new Database(tmp, { readonly: true });
        const chk = viejo.pragma('integrity_check', { simple: true });
        if (chk !== 'ok') { res.error = 'El archivo no es una base SQLite sana (integrity_check: ' + chk + ').'; return res; }
        for (const t of ['clientes', 'vehiculos', 'ordenes_trabajo']) {
            if (!viejo.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t)) { res.error = `Falta la tabla ${t}: no parece la base del sistema anterior.`; return res; }
        }
        viejo.close(); viejo = null;

        db.exec(`CREATE TABLE IF NOT EXISTS importaciones_log (tabla TEXT NOT NULL, viejo_id INTEGER NOT NULL, nuevo_id INTEGER NOT NULL, fecha TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (tabla, viejo_id))`);
        db.exec(`ATTACH DATABASE '${tmp.replace(/'/g, "''")}' AS old`); // ATTACH no se permite dentro de una transacción
        const tx = db.transaction(() => { corre(res); if (!aplicar) throw new Error('__vista_previa__'); });
        if (aplicar) {
            fs.mkdirSync(BACKUPS_DIR, { recursive: true });
            res.backup = path.join(BACKUPS_DIR, `pre-importacion-${Date.now()}.db`);
            db.exec(`VACUUM INTO '${res.backup.replace(/'/g, "''")}'`);
        }
        try { tx.immediate(); } catch (e: any) { if (e.message !== '__vista_previa__') throw e; }
        res.aplicado = aplicar; res.ok = true;
        return res;
    } catch (e: any) {
        res.error = e.message || String(e); res.ok = false; return res;
    } finally {
        try { viejo?.close(); } catch { /* */ }
        try { db.exec('DETACH DATABASE old'); } catch { /* no estaba adjunta */ }
        for (const ext of ['', '-wal', '-shm']) { try { fs.unlinkSync(tmp + ext); } catch { /* */ } }
    }
}

function corre(res: ResultadoImportacion) {
    const get = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
    const all = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
    const log = (tabla: string, viejo: number) => get('SELECT nuevo_id FROM importaciones_log WHERE tabla=? AND viejo_id=?', tabla, viejo)?.nuevo_id as number | undefined;
    const marca = (tabla: string, viejo: number, nuevo: number) => db.prepare('INSERT OR REPLACE INTO importaciones_log (tabla, viejo_id, nuevo_id) VALUES (?,?,?)').run(tabla, viejo, nuevo);

    // --- Qué órdenes son nuevas ---
    const ordHub = new Set<string>(all(`SELECT v.patente AS p, o.fecha AS f FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id`).map(r => normPlate(r.p) + '|' + r.f));
    const ordenesViejas = all(`SELECT o.*, v.patente AS _patente FROM old.ordenes_trabajo o JOIN old.vehiculos v ON v.id = o.vehiculo_id ORDER BY o.id`);
    const nuevas: any[] = [];
    for (const o of ordenesViejas) {
        if (log('ordenes', o.id) || ordHub.has(normPlate(o._patente) + '|' + o.fecha)) { res.ordenes_ya_estaban++; continue; }
        nuevas.push(o);
    }
    res.ordenes_nuevas = nuevas.length;
    if (nuevas.length) { const fs_ = nuevas.map(o => o.fecha as string).sort(); res.desde = fs_[0]; res.hasta = fs_[fs_.length - 1]; }
    for (const o of nuevas) { const s = String(o.sucursal_id || 1); res.porSucursal[s] = (res.porSucursal[s] || 0) + 1; }

    // --- Clientes y vehículos de esas órdenes ---
    const vIds = [...new Set(nuevas.map(o => o.vehiculo_id as number))];
    const cmap = new Map<number, number>();
    const vmap = new Map<number, number>();
    const hoy = new Date().toISOString().slice(0, 10);

    const hubClientes = all('SELECT id, nombre, dni, telefono FROM clientes');
    const porDniNombre = new Map<string, number>(); const porNombreTel = new Map<string, number>();
    for (const c of hubClientes) {
        const n = normName(c.nombre), d = validDni(c.dni), t = normTel(c.telefono);
        if (d && n) porDniNombre.set(d + '|' + n, c.id);
        if (n && t) porNombreTel.set(n + '|' + t, c.id);
    }
    const ccols = colsDe(db, 'main', 'clientes').filter(c => c !== 'id' && c !== 'portal_token' && colsDe(db, 'old', 'clientes').includes(c));
    const resolverCliente = (viejoId: number): number => {
        if (cmap.has(viejoId)) return cmap.get(viejoId)!;
        const prev = log('clientes', viejoId); if (prev) { cmap.set(viejoId, prev); return prev; }
        const c = get('SELECT * FROM old.clientes WHERE id=?', viejoId);
        if (!c) throw new Error(`Cliente ${viejoId} inexistente en la base vieja`);
        const n = normName(c.nombre), d = validDni(c.dni), t = normTel(c.telefono);
        let id = (d && n && porDniNombre.get(d + '|' + n)) || (n && t && porNombreTel.get(n + '|' + t)) || 0;
        if (!id) {
            const r = db.prepare(`INSERT INTO clientes (${ccols.join(',')}) VALUES (${ccols.map(() => '?').join(',')})`).run(...ccols.map(k => c[k]));
            id = Number(r.lastInsertRowid); res.clientes_nuevos++;
            if (d && n) porDniNombre.set(d + '|' + n, id); if (n && t) porNombreTel.set(n + '|' + t, id);
        }
        marca('clientes', viejoId, id); cmap.set(viejoId, id); return id;
    };

    const vcols = colsDe(db, 'main', 'vehiculos').filter(c => c !== 'id' && c !== 'cert_token' && colsDe(db, 'old', 'vehiculos').includes(c));
    for (const vid of vIds) {
        const v = get('SELECT * FROM old.vehiculos WHERE id=?', vid);
        const patente = normPlate(v.patente);
        const cid = resolverCliente(v.cliente_id);
        const ex = get('SELECT id, cliente_id FROM vehiculos WHERE patente = ?', patente);
        if (ex) {
            vmap.set(vid, ex.id);
            if (ex.cliente_id !== cid) { // cambió de dueño en el sistema viejo: se registra como traspaso
                db.prepare('UPDATE vehiculo_propietarios SET hasta = ? WHERE vehiculo_id = ? AND hasta IS NULL').run(hoy, ex.id);
                db.prepare('UPDATE vehiculos SET cliente_id = ? WHERE id = ?').run(cid, ex.id);
                db.prepare("INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde, motivo) VALUES (?,?,?,'traspaso (importación)')").run(ex.id, cid, hoy);
                res.titulares_cambiados++;
                res.avisos.push(`El vehículo ${patente} figura ahora con otro titular en la base vieja: se registró como traspaso.`);
            }
        } else {
            const vals = vcols.map(k => k === 'patente' ? patente : k === 'cliente_id' ? cid : v[k]);
            const r = db.prepare(`INSERT INTO vehiculos (${vcols.join(',')}) VALUES (${vcols.map(() => '?').join(',')})`).run(...vals);
            const nid = Number(r.lastInsertRowid); vmap.set(vid, nid); res.vehiculos_nuevos++;
            const primera = nuevas.filter(o => o.vehiculo_id === vid).map(o => String(o.fecha).slice(0, 10)).sort()[0] || hoy;
            db.prepare("INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde, motivo) VALUES (?,?,?,'alta')").run(nid, cid, primera);
        }
    }

    // --- Órdenes + puntos ---
    const ocolsNew = colsDe(db, 'main', 'ordenes_trabajo');
    const hist = db.prepare('SELECT * FROM old.puntos_historial WHERE orden_id = ? ORDER BY id');
    const insHist = db.prepare('INSERT INTO puntos_historial (cliente_id, orden_id, sucursal_id, puntos, concepto, fecha) VALUES (?,?,?,?,?,?)');
    const sumaPts = new Map<number, { p: number; f: string }>();
    for (const o of nuevas) {
        const d: any = { ...o }; delete d.id; delete d._patente;
        d.vehiculo_id = vmap.get(o.vehiculo_id);
        d.estado = 'terminada';
        d.sucursal_id = o.sucursal_id || 1;
        d.iniciada_at = o.hora_ingreso || o.fecha; d.cerrada_at = o.hora_fin_real || o.fecha;
        const movs = hist.all(o.id) as any[];
        d.puntos_otorgados = movs.reduce((a, m) => a + (m.puntos || 0), 0) ? 1 : 0;
        d.creada_por = 'importado'; d.cerrada_por = 'importado';
        const keys = Object.keys(d).filter(k => ocolsNew.includes(k));
        const r = db.prepare(`INSERT INTO ordenes_trabajo (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => d[k]));
        const nid = Number(r.lastInsertRowid); marca('ordenes', o.id, nid);
        for (const m of movs) {
            const cid = resolverCliente(m.cliente_id);
            insHist.run(cid, nid, m.sucursal_id || d.sucursal_id, m.puntos, m.concepto, m.fecha);
            marca('puntos_historial', m.id, 0);
            const s = sumaPts.get(cid) || { p: 0, f: '' }; s.p += m.puntos || 0; if (m.fecha > s.f) s.f = m.fecha; sumaPts.set(cid, s);
            res.puntos_movimientos++; res.puntos_total += m.puntos || 0;
        }
    }
    for (const [cid, s] of sumaPts) {
        const ex = get('SELECT cliente_id FROM puntos_clientes WHERE cliente_id = ?', cid);
        if (ex) db.prepare('UPDATE puntos_clientes SET puntos_acumulados = puntos_acumulados + ?, ultimo_movimiento = ? WHERE cliente_id = ?').run(s.p, s.f, cid);
        else db.prepare('INSERT INTO puntos_clientes (cliente_id, puntos_acumulados, ultimo_movimiento) VALUES (?,?,?)').run(cid, s.p, s.f);
    }
    // Aviso de integridad
    const sinSuc = nuevas.filter(o => !o.sucursal_id).length;
    if (sinSuc) res.avisos.push(`${sinSuc} órdenes venían sin sucursal: se asignaron a Central (Ledesma).`);
}
