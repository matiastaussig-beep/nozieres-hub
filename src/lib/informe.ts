import db from './db';
import { fechaAR, fechaCorta, sumarDias } from './tiempo';
import { cfg } from './mensajes';

/** Rango UTC (texto 'YYYY-MM-DD HH:MM:SS') que cubre el día calendario argentino (UTC-3). */
export function rangoUTC(fecha: string) {
    return { desde: `${fecha} 03:00:00`, hasta: `${sumarDias(fecha, 1)} 03:00:00`, desdeISO: `${fecha}T03:00:00.000Z`, hastaISO: `${sumarDias(fecha, 1)}T03:00:00.000Z` };
}

export interface ResumenDia {
    fecha: string; sucursal: string; abiertas: number; terminadas: number; enProceso: number; turnosManana: number; puntos: number;
    tecnicos: { nombre: string; n: number; promMin: number | null }[]; promMin: number | null; mensajesError: number;
}

export function resumenDia(fecha: string, sucursalId: number | null): ResumenDia {
    const r = rangoUTC(fecha);
    const filtro = sucursalId ? 'AND sucursal_id = ?' : '';
    const sp = sucursalId ? [sucursalId] : [];
    const n = (sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as { c: number }).c;
    const abiertas = n(`SELECT COUNT(*) c FROM ordenes_trabajo WHERE iniciada_at >= ? AND iniciada_at < ? ${filtro}`, r.desdeISO, r.hastaISO, ...sp);
    const term = db.prepare(`SELECT tecnico_asignado t, iniciada_at, cerrada_at FROM ordenes_trabajo WHERE cerrada_at >= ? AND cerrada_at < ? AND estado = 'terminada' ${filtro}`).all(r.desdeISO, r.hastaISO, ...sp) as any[];
    const porTec = new Map<string, number[]>();
    const todas: number[] = [];
    for (const o of term) {
        const m = o.iniciada_at ? Math.round((Date.parse(o.cerrada_at) - Date.parse(o.iniciada_at)) / 60000) : null;
        const nombre = (o.t || 'Sin asignar') as string;
        const arr = porTec.get(nombre) || []; if (m !== null && m >= 0) { arr.push(m); todas.push(m); } else arr.push(NaN); porTec.set(nombre, arr);
    }
    const avg = (a: number[]) => { const v = a.filter(x => !isNaN(x)); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
    const suc = sucursalId ? (db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(sucursalId) as any)?.nombre : 'Todas las sucursales';
    return {
        fecha, sucursal: suc || 'Sucursal', abiertas, terminadas: term.length,
        enProceso: n(`SELECT COUNT(*) c FROM ordenes_trabajo WHERE estado = 'en_proceso' ${filtro}`, ...sp),
        turnosManana: n(`SELECT COUNT(*) c FROM turnos WHERE fecha = ? AND estado = 'en_espera' ${filtro}`, sumarDias(fecha, 1), ...sp),
        puntos: n(`SELECT COALESCE(SUM(puntos),0) c FROM puntos_historial WHERE puntos > 0 AND fecha >= ? AND fecha < ? ${sucursalId ? 'AND sucursal_id = ?' : ''}`, r.desde, r.hasta, ...sp),
        tecnicos: [...porTec.entries()].map(([nombre, a]) => ({ nombre, n: a.length, promMin: avg(a) })).sort((x, y) => y.n - x.n),
        promMin: avg(todas),
        mensajesError: n(`SELECT COUNT(*) c FROM mensajes WHERE estado = 'error'`),
    };
}

export function textoInforme(r: ResumenDia): string {
    const l = [`📊 Nozieres · Cierre del ${fechaCorta(r.fecha)}`, `📍 ${r.sucursal}`, '',
        `🔧 Órdenes abiertas hoy: ${r.abiertas}`, `✅ Terminadas hoy: ${r.terminadas}`, `⏳ Siguen en proceso: ${r.enProceso}`,
        `⏱️ Tiempo promedio: ${r.promMin !== null ? r.promMin + ' min' : 's/d'}`, `⭐ Puntos acreditados: ${r.puntos}`, `📅 Turnos para mañana: ${r.turnosManana}`];
    if (r.tecnicos.length) { l.push('', 'Por técnico:'); for (const t of r.tecnicos) l.push(`• ${t.nombre}: ${t.n}${t.promMin !== null ? ` (prom. ${t.promMin} min)` : ''}`); }
    if (r.mensajesError) l.push('', `⚠️ Hay ${r.mensajesError} mensajes con error en la bandeja.`);
    return l.join('\n');
}

/** Informe consolidado + desglose por sucursal (lo que recibe quien no está atado a una sola sucursal). */
export function textoInformeCompleto(fecha: string, sucursalId: number | null): string {
    const base = textoInforme(resumenDia(fecha, sucursalId));
    if (sucursalId) return base;
    const sucs = db.prepare('SELECT id, nombre FROM sucursales WHERE activa IS NULL OR activa = 1 ORDER BY id').all() as { id: number; nombre: string }[];
    if (sucs.length < 2) return base;
    const bloques = sucs.map(sc => {
        const r = resumenDia(fecha, sc.id);
        const l = [`━━━━━━━━━━`, `📍 ${sc.nombre}`,
            `🔧 Abiertas: ${r.abiertas} · ✅ Terminadas: ${r.terminadas} · ⏳ En proceso: ${r.enProceso}`,
            `⏱️ Tiempo prom.: ${r.promMin !== null ? r.promMin + ' min' : 's/d'} · ⭐ Puntos: ${r.puntos} · 📅 Turnos mañana: ${r.turnosManana}`];
        if (r.tecnicos.length) for (const t of r.tecnicos) l.push(`• ${t.nombre}: ${t.n}${t.promMin !== null ? ` (prom. ${t.promMin} min)` : ''}`);
        return l.join('\n');
    });
    return `${base}\n\nDesglose por sucursal:\n${bloques.join('\n')}`;
}

export function generarInformesDelDia(fecha = fechaAR()): number {
    if (cfg('informe_activo', '1') !== '1') return 0;
    const dest = db.prepare('SELECT * FROM destinatarios_informe WHERE activo = 1').all() as any[];
    let n = 0;
    const cache = new Map<number | null, string>();
    for (const d of dest) {
        const key = d.sucursal_id ?? null;
        if (!cache.has(key)) cache.set(key, textoInformeCompleto(fecha, key));
        const cuerpo = cache.get(key)!;
        const destino = d.canal === 'whatsapp' ? (d.destino as string).replace(/\D/g, '') : d.destino;
        const r = db.prepare(`INSERT OR IGNORE INTO mensajes (tipo, canal, sucursal_id, destino, asunto, cuerpo, clave_unica, estado) VALUES ('informe_diario', ?, ?, ?, ?, ?, ?, 'pendiente')`)
            .run(d.canal, d.sucursal_id, destino, `Nozieres · cierre del ${fechaCorta(fecha)}`, cuerpo, `informe:${fecha}:${d.id}`);
        n += r.changes;
    }
    return n;
}
