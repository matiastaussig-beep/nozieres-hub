'use server';

import db from './db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermiso, puedeVerSucursal } from './auth';
import { guardarArchivo } from './files';
import { encolarMensajeCliente } from './mensajes';

export async function crearTurnoAction(formData: FormData): Promise<void> {
    const ses = await requirePermiso('agenda.editar');
    const sucursal_id = Number(formData.get('sucursal_id')) || ses.sucursalActivaId;
    if (!sucursal_id || !puedeVerSucursal(ses, sucursal_id)) redirect('/agenda?error=sucursal');
    const fecha = String(formData.get('fecha') || '');
    const hora = String(formData.get('hora') || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) redirect('/agenda/nuevo?error=fecha');
    let vehiculo_id = Number(formData.get('vehiculo_id')) || null;
    let cliente_id = Number(formData.get('cliente_id')) || null;
    // Cliente y/o vehículo nuevos cargados en la misma pantalla de la agenda
    if (String(formData.get('es_nuevo') || '') === '1') {
        const patente = String(formData.get('nuevo_patente') || '').toUpperCase().replace(/\s+/g, '');
        const nombre = String(formData.get('nuevo_nombre') || '').trim();
        const telefono = String(formData.get('nuevo_telefono') || '').trim();
        if (!patente) redirect('/agenda/nuevo?error=patente');
        const existente = db.prepare('SELECT id FROM vehiculos WHERE patente = ?').get(patente) as { id: number } | undefined;
        if (existente) vehiculo_id = existente.id;   // el dominio ya está cargado: se usa su titular actual
        else {
            if (!nombre || !telefono) redirect('/agenda/nuevo?error=cliente');
            db.transaction(() => {
                const dni = String(formData.get('nuevo_dni') || '').trim() || null;
                const email = String(formData.get('nuevo_email') || '').trim() || null;
                const cid = Number(db.prepare('INSERT INTO clientes (nombre, dni, telefono, email) VALUES (?,?,?,?)').run(nombre, dni, telefono, email).lastInsertRowid);
                const vid = Number(db.prepare('INSERT INTO vehiculos (patente, marca, modelo, cliente_id, tipo_vehiculo) VALUES (?,?,?,?,?)')
                    .run(patente, String(formData.get('nuevo_marca') || '').trim() || null, String(formData.get('nuevo_modelo') || '').trim() || null, cid, String(formData.get('nuevo_tipo') || 'Auto')).lastInsertRowid);
                db.prepare("INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde, motivo) VALUES (?, ?, date('now','-3 hours'), 'alta')").run(vid, cid);
                vehiculo_id = vid;
            })();
        }
    }
    if (vehiculo_id) {
        const v = db.prepare('SELECT cliente_id FROM vehiculos WHERE id = ?').get(vehiculo_id) as { cliente_id: number } | undefined;
        if (v) cliente_id = v.cliente_id;   // el cliente siempre es el titular actual del vehículo
    }
    if (!cliente_id && !vehiculo_id) redirect('/agenda/nuevo?error=vehiculo');
    const r = db.prepare(`INSERT INTO turnos (sucursal_id, cliente_id, vehiculo_id, fecha, hora, duracion_min, tecnico, presupuesto_nro, motivo, notas, creado_por)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(sucursal_id, cliente_id, vehiculo_id, fecha, hora || null, Number(formData.get('duracion_min')) || 30, String(formData.get('tecnico') || '').trim() || null,
            String(formData.get('presupuesto_nro') || '').trim() || null, String(formData.get('motivo') || '').trim() || null, String(formData.get('notas') || '').trim() || null, ses.id);
    const id = Number(r.lastInsertRowid);
    const pdf = formData.get('presupuesto_pdf');
    if (pdf instanceof File && pdf.size > 0) {
        try { await guardarArchivo(pdf, 'presupuesto_pdf', { turnoId: id }, ses.id); } catch (e: any) { redirect(`/agenda/${id}?aviso=${encodeURIComponent(e.message)}`); }
    }
    // Aviso "turno confirmado": cartel de WhatsApp para mandarlo en el momento (y mail automático)
    let avisar = '';
    if (cliente_id) {
        encolarMensajeCliente('turno_confirmado', { cliente_id, turno_id: id, sucursal_id, fecha, hora: hora || null, vehiculo_id }, `turno:${id}`);
        avisar = `&avisar=${id}`;
    }
    revalidatePath('/agenda'); revalidatePath('/clientes'); revalidatePath('/vehiculos');
    redirect(`/agenda?fecha=${fecha}&ok=1${avisar}`);
}

export async function adjuntarPresupuestoTurnoAction(turnoId: number, formData: FormData): Promise<void> {
    const ses = await requirePermiso('agenda.editar');
    const t = db.prepare('SELECT sucursal_id FROM turnos WHERE id = ?').get(turnoId) as { sucursal_id: number } | undefined;
    if (!t || !puedeVerSucursal(ses, t.sucursal_id)) throw new Error('Turno no encontrado');
    const nro = String(formData.get('presupuesto_nro') || '').trim();
    if (nro) db.prepare('UPDATE turnos SET presupuesto_nro = ? WHERE id = ?').run(nro, turnoId);
    const pdf = formData.get('presupuesto_pdf');
    let aviso = '';
    if (pdf instanceof File && pdf.size > 0) { try { await guardarArchivo(pdf, 'presupuesto_pdf', { turnoId }, ses.id); } catch (e: any) { aviso = `&aviso=${encodeURIComponent(e.message)}`; } }
    revalidatePath(`/agenda/${turnoId}`);
    redirect(`/agenda/${turnoId}?ok=1${aviso}`);
}

export async function cancelarTurnoAction(turnoId: number): Promise<void> {
    const ses = await requirePermiso('agenda.editar');
    const t = db.prepare('SELECT sucursal_id, estado, fecha FROM turnos WHERE id = ?').get(turnoId) as any;
    if (!t || !puedeVerSucursal(ses, t.sucursal_id)) throw new Error('Turno no encontrado');
    if (t.estado === 'en_espera') db.prepare('DELETE FROM turnos WHERE id = ?').run(turnoId);   // sólo los que aún no empezaron
    revalidatePath('/agenda');
    redirect(`/agenda?fecha=${t.fecha}`);
}

/** Recordatorio manual (un clic) al cliente del turno. */
export async function recordarTurnoAction(turnoId: number): Promise<void> {
    const ses = await requirePermiso('agenda.editar');
    const t = db.prepare('SELECT * FROM turnos WHERE id = ?').get(turnoId) as any;
    if (!t || !puedeVerSucursal(ses, t.sucursal_id) || !t.cliente_id) throw new Error('Turno no encontrado');
    encolarMensajeCliente('turno_recordatorio' as any, { cliente_id: t.cliente_id, turno_id: turnoId, sucursal_id: t.sucursal_id, vehiculo_id: t.vehiculo_id, fecha: t.fecha, hora: t.hora }, `turno:${turnoId}:${Date.now()}`);
    redirect(`/mensajes`);
}
