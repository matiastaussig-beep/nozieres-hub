import db from './db';

export interface FilaOrden {
    id: number; fecha: string; estado: string; sucursal_id: number; sucursal_nombre: string | null;
    vehiculo_patente: string; vehiculo_marca: string | null; vehiculo_modelo: string | null; cliente_nombre: string; cliente_id: number;
    tecnico_asignado: string | null; hora_ingreso: string | null; hora_fin_real: string | null;
    iniciada_at: string | null; cerrada_at: string | null; presupuesto_nro: string | null;
}

const marks = (ids: number[]) => ids.map(() => '?').join(',') || 'NULL';

export function listarOrdenes(o: { sucursales: number[]; q?: string; estado?: string; page?: number; limit?: number }) {
    const limit = o.limit ?? 25, page = Math.max(1, o.page ?? 1);
    let where = `WHERE ot.sucursal_id IN (${marks(o.sucursales)})`;
    const p: any[] = [...o.sucursales];
    if (o.estado && ['en_proceso', 'terminada'].includes(o.estado)) { where += ' AND ot.estado = ?'; p.push(o.estado); }
    if (o.q) { where += ' AND (v.patente LIKE ? OR c.nombre LIKE ? OR c.dni LIKE ? OR c.telefono LIKE ?)'; const s = `%${o.q}%`; p.push(s, s, s, s); }
    const from = `FROM ordenes_trabajo ot JOIN vehiculos v ON v.id = ot.vehiculo_id JOIN clientes c ON c.id = v.cliente_id LEFT JOIN sucursales s ON s.id = ot.sucursal_id`;
    const total = (db.prepare(`SELECT COUNT(*) c ${from} ${where}`).get(...p) as { c: number }).c;
    const rows = db.prepare(`SELECT ot.id, ot.fecha, ot.estado, ot.sucursal_id, s.nombre sucursal_nombre, v.patente vehiculo_patente, v.marca vehiculo_marca, v.modelo vehiculo_modelo,
            c.nombre cliente_nombre, c.id cliente_id, ot.tecnico_asignado, ot.hora_ingreso, ot.hora_fin_real, ot.iniciada_at, ot.cerrada_at, ot.presupuesto_nro
        ${from} ${where} ORDER BY (ot.estado = 'en_proceso') DESC, ot.fecha DESC, ot.id DESC LIMIT ? OFFSET ?`).all(...p, limit, (page - 1) * limit) as FilaOrden[];
    return { rows, total, pages: Math.max(1, Math.ceil(total / limit)), page };
}

export function tecnicosActivos(): string[] {
    const r = db.prepare("SELECT valor FROM configuracion WHERE clave = 'tecnicos_activos'").get() as { valor: string } | undefined;
    return (r?.valor || '').split(',').map(s => s.trim()).filter(Boolean);
}

/** Duración en minutos: usa los instantes reales; para órdenes históricas, las horas HH:MM guardadas. */
export function duracionMin(o: { iniciada_at?: string | null; cerrada_at?: string | null; hora_ingreso?: string | null; hora_fin_real?: string | null; estado?: string }): number | null {
    if (o.iniciada_at && o.cerrada_at) { const d = Math.round((Date.parse(o.cerrada_at) - Date.parse(o.iniciada_at)) / 60000); return d >= 0 ? d : null; }
    if (o.iniciada_at) return null;
    if (!o.hora_ingreso || !o.hora_fin_real) return null;
    const [h1, m1] = o.hora_ingreso.split(':').map(Number), [h2, m2] = o.hora_fin_real.split(':').map(Number);
    if ([h1, m1, h2, m2].some(isNaN)) return null;
    let d = h2 * 60 + m2 - (h1 * 60 + m1);
    if (d < 0) d += 1440;
    return d < 600 ? d : null;
}
export function fmtDur(min: number | null) { return min === null ? '-' : min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`; }
export const ESTADO_LABEL: Record<string, string> = { en_espera: 'En espera', en_proceso: 'En proceso', terminada: 'Terminada' };
export const ESTADO_CLASE: Record<string, string> = { en_espera: 'badge-espera', en_proceso: 'badge-proceso', terminada: 'badge-terminada' };
