import db from './db';
import { fechaAR, fechaCorta, sumarDias } from './tiempo';
import { cfg, baseUrl } from './mensajes';
import { productividad } from './productividad';

/** Rango UTC (texto 'YYYY-MM-DD HH:MM:SS') que cubre el día calendario argentino (UTC-3). */
export function rangoUTC(fecha: string, hastaFecha: string = fecha) {
    return { desde: `${fecha} 03:00:00`, hasta: `${sumarDias(hastaFecha, 1)} 03:00:00`, desdeISO: `${fecha}T03:00:00.000Z`, hastaISO: `${sumarDias(hastaFecha, 1)}T03:00:00.000Z` };
}

export interface ResumenDia {
    fecha: string; hasta: string; sucursal: string; abiertas: number; terminadas: number; enProceso: number; turnosManana: number; puntos: number;
    tecnicos: { nombre: string; n: number; promMin: number | null }[]; promMin: number | null; mensajesError: number;
}

export function resumenDia(fecha: string, sucursalId: number | null, hasta: string = fecha): ResumenDia {
    const r = rangoUTC(fecha, hasta);
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
        fecha, hasta, sucursal: suc || 'Sucursal', abiertas, terminadas: term.length,
        enProceso: n(`SELECT COUNT(*) c FROM ordenes_trabajo WHERE estado = 'en_proceso' ${filtro}`, ...sp),
        turnosManana: n(`SELECT COUNT(*) c FROM turnos WHERE fecha = ? AND estado = 'en_espera' ${filtro}`, sumarDias(hasta, 1), ...sp),
        puntos: n(`SELECT COALESCE(SUM(puntos),0) c FROM puntos_historial WHERE puntos > 0 AND fecha >= ? AND fecha < ? ${sucursalId ? 'AND sucursal_id = ?' : ''}`, r.desde, r.hasta, ...sp),
        tecnicos: [...porTec.entries()].map(([nombre, a]) => ({ nombre, n: a.length, promMin: avg(a) })).sort((x, y) => y.n - x.n),
        promMin: avg(todas),
        mensajesError: n(`SELECT COUNT(*) c FROM mensajes WHERE estado = 'error'`),
    };
}

export function textoInforme(r: ResumenDia): string {
    const rango = r.hasta !== r.fecha;
    const cuando = rango ? 'en el período' : 'hoy';
    const l = [`📊 Nozieres · ${rango ? `Informe del ${fechaCorta(r.fecha)} al ${fechaCorta(r.hasta)}` : `Cierre del ${fechaCorta(r.fecha)}`}`, `📍 ${r.sucursal}`, '',
        `🔧 Órdenes abiertas ${cuando}: ${r.abiertas}`, `✅ Terminadas ${cuando}: ${r.terminadas}`, `⏳ Siguen en proceso: ${r.enProceso}`,
        `⏱️ Tiempo promedio: ${r.promMin !== null ? r.promMin + ' min' : 's/d'}`, `⭐ Puntos acreditados: ${r.puntos}`, `📅 Turnos ${rango ? 'próximos' : 'para mañana'}: ${r.turnosManana}`];
    if (r.tecnicos.length) { l.push('', 'Por técnico:'); for (const t of r.tecnicos) l.push(`• ${t.nombre}: ${t.n}${t.promMin !== null ? ` (prom. ${t.promMin} min)` : ''}`); }
    if (r.mensajesError) l.push('', `⚠️ Hay ${r.mensajesError} mensajes con error en la bandeja.`);
    return l.join('\n');
}

/** Informe consolidado + desglose por sucursal (lo que recibe quien no está atado a una sola sucursal). */
export function textoInformeCompleto(fecha: string, sucursalId: number | null, hasta: string = fecha): string {
    const base = textoInforme(resumenDia(fecha, sucursalId, hasta));
    if (sucursalId) return base;
    const sucs = db.prepare('SELECT id, nombre FROM sucursales WHERE activa IS NULL OR activa = 1 ORDER BY id').all() as { id: number; nombre: string }[];
    if (sucs.length < 2) return base;
    const bloques = sucs.map(sc => {
        const r = resumenDia(fecha, sc.id, hasta);
        const l = [`━━━━━━━━━━`, `📍 ${sc.nombre}`,
            `🔧 Abiertas: ${r.abiertas} · ✅ Terminadas: ${r.terminadas} · ⏳ En proceso: ${r.enProceso}`,
            `⏱️ Tiempo prom.: ${r.promMin !== null ? r.promMin + ' min' : 's/d'} · ⭐ Puntos: ${r.puntos} · 📅 Turnos: ${r.turnosManana}`];
        if (r.tecnicos.length) for (const t of r.tecnicos) l.push(`• ${t.nombre}: ${t.n}${t.promMin !== null ? ` (prom. ${t.promMin} min)` : ''}`);
        return l.join('\n');
    });
    return `${base}\n\nDesglose por sucursal:\n${bloques.join('\n')}`;
}


// ---------- Informe de cierre para gerencia (datos iguales a la pantalla Productividad) ----------
const delta = (a: number, b?: number) => b === undefined ? '' : ` (${a - b > 0 ? '+' : ''}${a - b})`;
const semaforo = (pct: number | null, total: number) => total === 0 || pct === null ? '⚪' : pct >= 80 ? '🟢' : pct >= 60 ? '🟡' : '🔴';

function datosCierre(fecha: string, hasta: string) {
    const sucs = db.prepare('SELECT id, nombre FROM sucursales WHERE activa IS NULL OR activa = 1 ORDER BY id').all() as { id: number; nombre: string }[];
    const ids = sucs.map(s => s.id);
    const total = productividad({ desde: fecha, hasta, sucursales: ids });
    const porSuc = sucs.map(s => ({ s, p: productividad({ desde: fecha, hasta, sucursales: [s.id] }), puntos: resumenDia(fecha, s.id, hasta).puntos }));
    const mes = fecha === hasta ? productividad({ desde: hasta.slice(0, 8) + '01', hasta, sucursales: ids }, false).total : null;
    const r = rangoUTC(fecha, hasta);
    const sinPresupuesto = (db.prepare(`SELECT COUNT(*) c FROM ordenes_trabajo WHERE estado = 'terminada' AND iniciada_at LIKE '%-%' AND cerrada_at >= ? AND cerrada_at < ? AND (presupuesto_nro IS NULL OR TRIM(presupuesto_nro) = '')`).get(r.desdeISO, r.hastaISO) as { c: number }).c;
    return { total, porSuc, mes, base: resumenDia(fecha, null, hasta), sinPresupuesto };
}
const tituloCierre = (fecha: string, hasta: string) => hasta === fecha ? `Cierre del ${fechaCorta(fecha)}` : `Informe del ${fechaCorta(fecha)} al ${fechaCorta(hasta)}`;
const linkPanel = (fecha: string, hasta: string) => { try { const b = baseUrl(); return b ? `${b}/informes?desde=${fecha}&hasta=${hasta}` : ''; } catch { return ''; } };

/** Versión corta con semáforo por sucursal (para WhatsApp). */
export function textoCierreWhatsApp(fecha: string, hasta: string = fecha): string {
    const d = datosCierre(fecha, hasta);
    const vs = hasta === fecha ? 'vs ayer' : 'vs período anterior';
    const l = [`📊 Nozieres · ${tituloCierre(fecha, hasta)}`, ''];
    const alertas: string[] = [];
    for (const { s, p } of d.porSuc) {
        l.push(`${semaforo(p.enTiempoPct, p.total)} ${s.nombre}: ${p.total} servicios${delta(p.total, p.anterior?.total)}${p.enTiempoPct !== null ? ` · ${p.enTiempoPct}% en tiempo` : ''}`);
        if (p.enTiempoPct !== null && p.enTiempoPct < 80) alertas.push(`${s.nombre}: ${p.conTiempo - Math.round(p.conTiempo * p.enTiempoPct / 100)} órdenes pasaron el tiempo estándar`);
    }
    l.push('', `Total: ${d.total.total} (${(d.total.anterior ? (d.total.total - d.total.anterior.total > 0 ? '+' : '') + (d.total.total - d.total.anterior.total) : '0')} ${vs})${d.mes !== null ? ` · Mes: ${d.mes}` : ''}`,
        `⏳ En proceso: ${d.base.enProceso} · 📅 Turnos ${hasta === fecha ? 'mañana' : 'próximos'}: ${d.base.turnosManana}`);
    if (d.base.mensajesError) alertas.push(`${d.base.mensajesError} mensajes a clientes con error`);
    if (d.sinPresupuesto) alertas.push(`${d.sinPresupuesto} ${d.sinPresupuesto === 1 ? 'orden terminada' : 'órdenes terminadas'} sin Nº de presupuesto de Boxer`);
    if (alertas.length) l.push('', '⚠️ Atención:', ...alertas.map(a => `• ${a}`));
    if (d.total.topServicios.length) l.push('', `🔝 Top: ${d.total.topServicios.slice(0, 3).map(([n]) => n).join(' · ')}`);
    const link = linkPanel(fecha, hasta);
    if (link) l.push('', `Detalle por técnico: ${link}`);
    return l.join('\n');
}

/** Versión completa con consolidado, sucursales, técnicos y servicios más pedidos (para mail). */
export function textoCierreMail(fecha: string, hasta: string = fecha): string {
    const d = datosCierre(fecha, hasta);
    const vs = hasta === fecha ? 'vs ayer' : 'vs período anterior';
    const t = d.total;
    const min = (m: number | null) => m !== null ? `${m} min` : 's/d';
    const l = [`📊 Nozieres · ${tituloCierre(fecha, hasta)}`, '',
        `✅ Terminados: ${t.total}${delta(t.total, t.anterior?.total)} ${vs}`,
        `⏳ Siguen en proceso: ${d.base.enProceso}`,
        `⏱️ Tiempo promedio: ${min(t.promMin)}${t.medianaMin !== null ? ` (mediana ${t.medianaMin})` : ''} · ${t.enTiempoPct !== null ? t.enTiempoPct + '% en tiempo estándar' : 'en tiempo estándar: s/d'}`,
        `⭐ Puntos: ${d.base.puntos} · 📅 Turnos ${hasta === fecha ? 'mañana' : 'próximos'}: ${d.base.turnosManana}`];
    for (const { s, p, puntos } of d.porSuc) {
        l.push('', '━━━━━━━━━━', `📍 ${s.nombre}`,
            `✅ ${p.total}${delta(p.total, p.anterior?.total)} · ⏱️ ${min(p.promMin)} · ${p.enTiempoPct !== null ? p.enTiempoPct + '% en tiempo' : 'en tiempo s/d'} · ⭐ ${puntos}`);
        const tec = p.tecnicos.map(x => `${x.tecnico.startsWith('Otros') ? 'Otros' : x.tecnico}: ${x.ordenes}${x.promMin !== null ? ` (${x.promMin} min)` : ''}`);
        if (tec.length) l.push(`• ${tec.join(' · ')}`);
    }
    if (t.topServicios.length) l.push('', `🔝 Servicios más pedidos: ${t.topServicios.slice(0, 5).map(([n, c]) => `${n} ${c}`).join(' · ')}`);
    if (d.mes !== null) l.push('', `📈 Acumulado del mes: ${d.mes} servicios`);
    if (d.base.mensajesError) l.push(`⚠️ ${d.base.mensajesError} mensajes con error en la bandeja`);
    if (d.sinPresupuesto) l.push(`🧾 ${d.sinPresupuesto} ${d.sinPresupuesto === 1 ? 'orden terminada' : 'órdenes terminadas'} sin Nº de presupuesto de Boxer`);
    const link = linkPanel(fecha, hasta);
    if (link) l.push('', `Ver detalle: ${link}`);
    return l.join('\n');
}

export function generarInformesDelDia(fecha = fechaAR(), hasta: string = fecha): number {
    if (cfg('informe_activo', '1') !== '1') return 0;
    const dest = db.prepare('SELECT * FROM destinatarios_informe WHERE activo = 1').all() as any[];
    let n = 0;
    // Los informes son para gerencia: un único informe consolidado (con desglose por sucursal), que sale desde Central.
    // Por ahora todos reciben la versión completa (cfg informe_wa_completo = '0' vuelve a la corta con semáforo para WhatsApp).
    const cuerpoMail = textoCierreMail(fecha, hasta);
    const cuerpoWA = cfg('informe_wa_completo', '1') === '1' ? cuerpoMail : textoCierreWhatsApp(fecha, hasta);
    const sufijo = hasta === fecha ? '' : `:${hasta}`;
    for (const d of dest) {
        const cuerpo = d.canal === 'whatsapp' ? cuerpoWA : cuerpoMail;
        const destino = d.canal === 'whatsapp' ? (d.destino as string).replace(/\D/g, '') : d.destino;
        const r = db.prepare(`INSERT OR IGNORE INTO mensajes (tipo, canal, sucursal_id, destino, asunto, cuerpo, clave_unica, estado) VALUES ('informe_diario', ?, NULL, ?, ?, ?, ?, 'pendiente')`)
            .run(d.canal, destino, hasta === fecha ? `Nozieres · cierre del ${fechaCorta(fecha)}` : `Nozieres · informe del ${fechaCorta(fecha)} al ${fechaCorta(hasta)}`, cuerpo, `informe:${fecha}${sufijo}:${d.id}`);
        n += r.changes;
    }
    return n;
}
