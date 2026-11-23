import fs from 'fs';
import path from 'path';
import db from './db';
import { BACKUPS_DIR, ensureDirs } from './paths';
import { cfg, encolarMensajeCliente } from './mensajes';
import { enviarEmail, enviarWhatsApp, smtpConfigurado, waConfigurado } from './providers';
import { fechaAR, horaAR, sumarDias } from './tiempo';
import { generarInformesDelDia } from './informe';

let corriendo = false;

function yaCorrio(clave: string, fecha: string) {
    const r = db.prepare('SELECT ultima_ejecucion FROM tareas_programadas WHERE clave = ?').get(clave) as { ultima_ejecucion: string } | undefined;
    return r?.ultima_ejecucion === fecha;
}
function marcar(clave: string, fecha: string) {
    db.prepare('INSERT INTO tareas_programadas (clave, ultima_ejecucion) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET ultima_ejecucion = excluded.ultima_ejecucion').run(clave, fecha);
}

export function hacerBackup() {
    ensureDirs();
    const fecha = fechaAR();
    const dest = path.join(BACKUPS_DIR, `nozieres-${fecha}.db`);
    if (!fs.existsSync(dest)) db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    const viejos = fs.readdirSync(BACKUPS_DIR).filter(f => /^nozieres-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -14);
    for (const f of viejos) fs.unlinkSync(path.join(BACKUPS_DIR, f));
    return dest;
}

export function encolarRecordatorios(hoy: string, hora: string) {
    const h = Number(hora.slice(0, 2));
    if (h < 9 || h >= 20) return;                    // sólo en horario razonable para escribirle a un cliente
    // Turnos: aviso N horas antes (por defecto 24)
    const horas = Number(cfg('turno_recordatorio_horas', '24')) || 24;
    const limite = new Date(Date.now() + horas * 3600e3);
    const limFecha = fechaAR(limite);
    const turnos = db.prepare(`SELECT id, cliente_id, vehiculo_id, sucursal_id, fecha, hora FROM turnos WHERE estado = 'en_espera' AND cliente_id IS NOT NULL AND fecha >= ? AND fecha <= ?`).all(hoy, limFecha) as any[];
    for (const t of turnos) {
        const ts = Date.parse(`${t.fecha}T${t.hora || '09:00'}:00-03:00`);
        if (ts - Date.now() <= horas * 3600e3 && ts > Date.now()) encolarMensajeCliente('turno_recordatorio', { cliente_id: t.cliente_id, turno_id: t.id, sucursal_id: t.sucursal_id, vehiculo_id: t.vehiculo_id, fecha: t.fecha, hora: t.hora }, `turnoauto:${t.id}`);
    }
    // Service próximo a vencer: sólo la última orden terminada de cada vehículo
    if (cfg('recordatorio_service_activo', '0') === '1') {
        const dias = Number(cfg('recordatorio_service_dias', '7')) || 7;
        const filas = db.prepare(`
            SELECT o.id, o.sucursal_id, o.proximo_servicio_fecha f, o.vehiculo_id, v.cliente_id FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id
            WHERE o.estado = 'terminada' AND o.proximo_servicio_fecha BETWEEN ? AND ?
              AND NOT EXISTS (SELECT 1 FROM ordenes_trabajo o2 WHERE o2.vehiculo_id = o.vehiculo_id AND o2.id > o.id)`).all(hoy, sumarDias(hoy, dias)) as any[];
        for (const o of filas) encolarMensajeCliente('service_proximo', { cliente_id: o.cliente_id, orden_id: o.id, sucursal_id: o.sucursal_id, vehiculo_id: o.vehiculo_id, fecha: o.f }, `service:${o.id}`);
    }
}

async function enviarPendientes() {
    const modoAuto = waConfigurado();
    const filas = db.prepare(`SELECT * FROM mensajes WHERE estado IN ('pendiente') AND programado_para <= datetime('now') ORDER BY id LIMIT 25`).all() as any[];
    for (const m of filas) {
        if (m.canal === 'email') {
            if (!smtpConfigurado()) { db.prepare("UPDATE mensajes SET estado = 'manual' WHERE id = ?").run(m.id); continue; }
            const r = await enviarEmail(m.destino, m.asunto || 'Nozieres', m.cuerpo);
            registrar(m, r);
        } else {
            if (!modoAuto) { db.prepare("UPDATE mensajes SET estado = 'manual' WHERE id = ?").run(m.id); continue; }   // sin WhatsApp automático: queda en la bandeja para enviar con un clic
            const r = await enviarWhatsApp(m.destino, m.cuerpo);
            registrar(m, r);
        }
    }
}
function registrar(m: any, r: { ok: boolean; error?: string }) {
    if (r.ok) db.prepare("UPDATE mensajes SET estado = 'enviado', enviado_at = datetime('now'), intentos = intentos + 1, error = NULL WHERE id = ?").run(m.id);
    else {
        const intentos = m.intentos + 1;
        db.prepare("UPDATE mensajes SET intentos = ?, error = ?, estado = ?, programado_para = datetime('now', ?) WHERE id = ?")
            .run(intentos, r.error || 'error', intentos >= 4 ? 'error' : 'pendiente', `+${intentos * 10} minutes`, m.id);
    }
}

/** Corre cada minuto: recordatorios, informe diario, envío de mensajes y copia de seguridad nocturna. Nunca lanza errores hacia afuera. */
export async function tick() {
    if (corriendo) return;
    corriendo = true;
    try {
        const hoy = fechaAR(), hora = horaAR();
        const horaInforme = cfg('informe_hora', '20:30');
        if (hora >= horaInforme && !yaCorrio('informe', hoy)) { generarInformesDelDia(hoy); marcar('informe', hoy); }
        if (hora >= '03:00' && hora < '06:00' && !yaCorrio('backup', hoy)) { hacerBackup(); marcar('backup', hoy); }
        if (!yaCorrio(`recordatorios:${hora.slice(0, 2)}`, hoy)) { encolarRecordatorios(hoy, hora); marcar(`recordatorios:${hora.slice(0, 2)}`, hoy); }
        await enviarPendientes();
    } catch (e) { console.error('[scheduler]', e); }
    finally { corriendo = false; }
}
