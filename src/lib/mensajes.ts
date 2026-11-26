import db from './db';
import { fechaCorta } from './tiempo';
import crypto from 'crypto';

export type TipoMensaje = 'recibimos_auto' | 'auto_listo' | 'service_proximo' | 'informe_diario' | 'turno_recordatorio' | 'turno_confirmado' | 'postventa';

export function cfg(clave: string, def = ''): string {
    const r = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave) as { valor: string } | undefined;
    return r?.valor ?? def;
}

/** Teléfono argentino -> formato internacional para WhatsApp (549 + área + número). Devuelve null si no parece válido. */
export function normalizarTelefono(raw?: string | null): string | null {
    if (!raw) return null;
    let d = raw.replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('54')) {
        d = d.slice(2);
        if (d.startsWith('9')) d = d.slice(1);
    }
    if (d.startsWith('0')) d = d.slice(1);
    const m = /^(\d{2,4})15(\d{6,8})$/.exec(d);          // 388 15 6705166 -> 3886705166
    if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
    if (d.length !== 10) return null;
    return '549' + d;
}

export function baseUrl() { return (process.env.APP_URL || '').replace(/\/$/, ''); }

export function tokenPortal(clienteId: number): string {
    const r = db.prepare('SELECT portal_token FROM clientes WHERE id = ?').get(clienteId) as { portal_token: string | null } | undefined;
    if (r?.portal_token) return r.portal_token;
    const t = crypto.randomBytes(18).toString('base64url');
    db.prepare('UPDATE clientes SET portal_token = ? WHERE id = ?').run(t, clienteId);
    return t;
}
export function tokenCertificado(vehiculoId: number): string {
    const r = db.prepare('SELECT cert_token FROM vehiculos WHERE id = ?').get(vehiculoId) as { cert_token: string | null } | undefined;
    if (r?.cert_token) return r.cert_token;
    const t = crypto.randomBytes(18).toString('base64url');
    db.prepare('UPDATE vehiculos SET cert_token = ? WHERE id = ?').run(t, vehiculoId);
    return t;
}

function render(plantilla: string, vars: Record<string, string>) {
    return plantilla.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

interface Contexto { hora?: string | null; cliente_id: number; orden_id?: number | null; turno_id?: number | null; sucursal_id?: number | null; fecha?: string | null; vehiculo_id?: number | null }

/** Arma y encola un mensaje para el cliente. `claveUnica` evita enviarlo dos veces. Devuelve true si se encoló. */
export function encolarMensajeCliente(tipo: Exclude<TipoMensaje, 'informe_diario'>, ctx: Contexto, claveUnica: string, programadoPara?: string): boolean {
    if (cfg('mensajes_activos', '1') !== '1') return false;
    const cli = db.prepare('SELECT id, nombre, telefono, email, avisos_whatsapp, avisos_email FROM clientes WHERE id = ?').get(ctx.cliente_id) as { id: number; nombre: string; telefono: string | null; email: string | null; avisos_whatsapp: number | null; avisos_email: number | null } | undefined;
    if (!cli) return false;
    const destino = normalizarTelefono(cli.telefono);
    const veh = ctx.vehiculo_id
        ? db.prepare('SELECT marca, modelo, patente FROM vehiculos WHERE id = ?').get(ctx.vehiculo_id) as any
        : ctx.orden_id ? db.prepare('SELECT v.marca, v.modelo, v.patente FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id WHERE o.id = ?').get(ctx.orden_id) as any : null;
    const suc = ctx.sucursal_id ? db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(ctx.sucursal_id) as { nombre: string } | undefined : undefined;
    const portal = baseUrl() ? `${baseUrl()}/p/${tokenPortal(cli.id)}` : '';
    const plantillaKey = tipo === 'recibimos_auto' ? 'plantilla_recibimos' : tipo === 'auto_listo' ? 'plantilla_listo' : tipo === 'turno_recordatorio' ? 'plantilla_turno' : tipo === 'turno_confirmado' ? 'plantilla_turno_confirmado' : tipo === 'postventa' ? 'plantilla_postventa' : 'plantilla_service';
    const cuerpo = render(cfg(plantillaKey), {
        cliente: (cli.nombre || '').split(' ')[0] || 'cliente',
        vehiculo: [veh?.marca, veh?.modelo].filter(Boolean).join(' ') || 'vehículo',
        patente: veh?.patente || '',
        sucursal: suc?.nombre || 'Nozieres',
        fecha: fechaCorta(ctx.fecha),
        hora: ctx.hora || '',
        portal,
    }).replace(/\s+Seguí el historial en\s*$/, '').trim();
    let encolado = false;
    // WhatsApp: sólo si el cliente lo aceptó (casilla en su perfil)
    if (cli.avisos_whatsapp !== 0) {
        const r = db.prepare(`INSERT OR IGNORE INTO mensajes (tipo, canal, cliente_id, orden_id, turno_id, sucursal_id, destino, cuerpo, clave_unica, programado_para, estado)
                              VALUES (?, 'whatsapp', ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?)`)
            .run(tipo, cli.id, ctx.orden_id ?? null, ctx.turno_id ?? null, ctx.sucursal_id ?? null, destino, cuerpo, claveUnica, programadoPara ?? null,
                destino ? 'pendiente' : 'descartado');
        if (!destino && r.changes) db.prepare("UPDATE mensajes SET error = 'El cliente no tiene un teléfono válido' WHERE clave_unica = ?").run(claveUnica);
        if (r.changes > 0) encolado = true;
    }
    // Mail: sólo si lo aceptó y tiene un email válido
    const mail = (cli.email || '').trim();
    if (cli.avisos_email !== 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        const asuntos: Record<string, string> = { recibimos_auto: 'Recibimos tu vehículo', auto_listo: 'Tu vehículo está listo', service_proximo: 'Tu service está por vencer', turno_recordatorio: 'Recordatorio de tu turno', turno_confirmado: 'Tu turno está confirmado', postventa: '¿Cómo te fue con tu vehículo?' };
        const r = db.prepare(`INSERT OR IGNORE INTO mensajes (tipo, canal, cliente_id, orden_id, turno_id, sucursal_id, destino, asunto, cuerpo, clave_unica, programado_para, estado)
                              VALUES (?, 'email', ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), 'pendiente')`)
            .run(tipo, cli.id, ctx.orden_id ?? null, ctx.turno_id ?? null, ctx.sucursal_id ?? null, mail, `${asuntos[tipo] || 'Aviso'} · Nozieres`, cuerpo, `${claveUnica}:mail`, programadoPara ?? null);
        if (r.changes > 0) encolado = true;
    }
    return encolado;
}
