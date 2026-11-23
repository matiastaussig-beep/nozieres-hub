import db from './db';
import { duracionMin, tecnicosActivos } from './queries';

export interface FilaTecnico { tecnico: string; ordenes: number; conTiempo: number; promMin: number | null; medianaMin: number | null; enTiempoPct: number | null; minutosTotales: number; desvioMin: number | null; porTipo: Record<string, number>; diasActivo: number; ordenesPorDia: number }

const STD_DEFAULT: Record<string, number> = { auto: 25, camioneta: 25, camion: 90 };
const norm = (t?: string | null) => (t || 'Auto').toLowerCase().replace('ó', 'o');

function estandares() {
    const g = (k: string, d: number) => { const r = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(k) as { valor: string } | undefined; const n = Number(r?.valor); return n > 0 ? n : d; };
    return { auto: g('tiempo_std_auto', 25), camioneta: g('tiempo_std_camioneta', 25), camion: g('tiempo_std_camion', 90) } as Record<string, number>;
}

/** Productividad por técnico en un período. Una orden hecha en equipo cuenta para cada técnico participante. */
export function productividad(o: { desde: string; hasta: string; sucursales: number[] }) {
    const std = estandares();
    const rows = db.prepare(`SELECT ot.id, ot.sucursal_id, date(ot.fecha) dia, ot.tecnico_asignado t, ot.iniciada_at, ot.cerrada_at, ot.hora_ingreso, ot.hora_fin_real, v.tipo_vehiculo
        FROM ordenes_trabajo ot JOIN vehiculos v ON v.id = ot.vehiculo_id
        WHERE ot.estado = 'terminada' AND date(ot.fecha) BETWEEN ? AND ? AND ot.sucursal_id IN (${o.sucursales.map(() => '?').join(',') || 'NULL'})`)
        .all(o.desde, o.hasta, ...o.sucursales) as any[];
    const acc = new Map<string, { n: number; mins: number[]; dias: Set<string>; tipo: Record<string, number>; dentro: number; dev: number[] }>();
    const todas: number[] = [];
    let dentroTotal = 0, conTiempoTotal = 0;
    for (const r of rows) {
        const tipo = norm(r.tipo_vehiculo);
        const lim = std[tipo] ?? STD_DEFAULT.auto;
        const d = duracionMin(r);
        const tecs = [...new Set(((r.t || 'Sin asignar') as string).split(/\s+y\s+|\s*[\/,+&]\s*/i).map(x => x.trim().replace(/\s+/g, ' ').toUpperCase()).filter(Boolean))];
        for (const t of tecs) {
            const a = acc.get(t) || { n: 0, mins: [], dias: new Set(), tipo: {}, dentro: 0, dev: [] };
            a.n++; a.dias.add(r.dia); a.tipo[tipo] = (a.tipo[tipo] || 0) + 1;
            if (d !== null) { a.mins.push(d); a.dev.push(d - lim); if (d <= lim * 1.1) a.dentro++; }
            acc.set(t, a);
        }
        if (d !== null) { todas.push(d); conTiempoTotal++; if (d <= lim * 1.1) dentroTotal++; }
    }
    const med = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const tecnicos: FilaTecnico[] = [...acc.entries()].map(([tecnico, a]) => ({
        tecnico, ordenes: a.n, conTiempo: a.mins.length,
        promMin: a.mins.length ? Math.round(sum(a.mins) / a.mins.length) : null, medianaMin: med(a.mins),
        enTiempoPct: a.mins.length ? Math.round((a.dentro / a.mins.length) * 100) : null,
        minutosTotales: sum(a.mins), desvioMin: a.dev.length ? Math.round(sum(a.dev) / a.dev.length) : null,
        porTipo: a.tipo, diasActivo: a.dias.size, ordenesPorDia: a.dias.size ? Math.round((a.n / a.dias.size) * 10) / 10 : 0,
    })).sort((x, y) => y.ordenes - x.ordenes);
    // Nombres sueltos/mal escritos del historial: se agrupan para no ensuciar el listado
    const activosUp = new Set(tecnicosActivos().map(x => x.toUpperCase()));
    const principales = tecnicos.filter(t => t.ordenes >= 20 || activosUp.has(t.tecnico));
    const resto = tecnicos.filter(t => !principales.includes(t));
    if (resto.length) {
        const n = resto.reduce((a, t) => a + t.ordenes, 0);
        principales.push({ tecnico: `Otros (${resto.length} nombres con pocas órdenes)`, ordenes: n, conTiempo: 0, promMin: null, medianaMin: null, enTiempoPct: null, minutosTotales: 0, desvioMin: null, porTipo: {}, diasActivo: 0, ordenesPorDia: 0 });
    }
    const porSucursal = db.prepare(`SELECT s.nombre, COUNT(*) n FROM ordenes_trabajo ot JOIN sucursales s ON s.id = ot.sucursal_id
        WHERE ot.estado = 'terminada' AND date(ot.fecha) BETWEEN ? AND ? AND ot.sucursal_id IN (${o.sucursales.map(() => '?').join(',') || 'NULL'}) GROUP BY s.id ORDER BY s.id`).all(o.desde, o.hasta, ...o.sucursales) as { nombre: string; n: number }[];
    // Servicios más pedidos
    const sv = new Map<string, number>();
    const lst = db.prepare(`SELECT servicios_autos a, servicios_camioneta b, servicios_camion c, complementos d FROM ordenes_trabajo ot WHERE ot.estado = 'terminada' AND date(ot.fecha) BETWEEN ? AND ? AND ot.sucursal_id IN (${o.sucursales.map(() => '?').join(',') || 'NULL'})`).all(o.desde, o.hasta, ...o.sucursales) as any[];
    for (const r of lst) for (const k of ['a', 'b', 'c', 'd']) { try { for (const x of JSON.parse(r[k] || '[]')) if (x) sv.set(x, (sv.get(x) || 0) + 1); } catch { /* dato viejo */ } }
    return {
        total: rows.length, conTiempo: conTiempoTotal,
        promMin: todas.length ? Math.round(sum(todas) / todas.length) : null, medianaMin: med(todas),
        enTiempoPct: conTiempoTotal ? Math.round((dentroTotal / conTiempoTotal) * 100) : null,
        tecnicos: principales, porSucursal, estandares: std, activos: tecnicosActivos(),
        topServicios: [...sv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
}
