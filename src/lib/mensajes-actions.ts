'use server';

import db from './db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermiso } from './auth';
import { generarInformesDelDia } from './informe';
import { fechaAR } from './tiempo';
import { tick } from './scheduler';

export async function marcarMensajeAction(id: number, estado: 'enviado' | 'descartado' | 'pendiente'): Promise<void> {
    await requirePermiso('mensajes');
    if (estado === 'enviado') db.prepare("UPDATE mensajes SET estado = 'enviado', enviado_at = datetime('now') WHERE id = ?").run(id);
    else if (estado === 'pendiente') db.prepare("UPDATE mensajes SET estado = 'pendiente', intentos = 0, error = NULL, programado_para = datetime('now') WHERE id = ?").run(id);
    else db.prepare("UPDATE mensajes SET estado = 'descartado' WHERE id = ?").run(id);
    revalidatePath('/mensajes');
}

export async function agregarDestinatarioAction(formData: FormData): Promise<void> {
    await requirePermiso('configuracion');
    const nombre = String(formData.get('nombre') || '').trim();
    const canal = String(formData.get('canal') || '');
    let destino = String(formData.get('destino') || '').trim();
    const suc = String(formData.get('sucursal_id') || '');
    if (!nombre || !['whatsapp', 'email'].includes(canal) || !destino) redirect('/configuracion/informes?error=datos');
    if (canal === 'whatsapp') {
        destino = destino.replace(/\D/g, '');
        if (destino.length === 10) destino = '549' + destino;
        if (destino.length < 11) redirect('/configuracion/informes?error=telefono');
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destino)) redirect('/configuracion/informes?error=email');
    db.prepare('INSERT INTO destinatarios_informe (nombre, canal, destino, sucursal_id) VALUES (?,?,?,?)').run(nombre, canal, destino, suc ? Number(suc) : null);
    revalidatePath('/configuracion/informes');
    redirect('/configuracion/informes?ok=1');
}

export async function quitarDestinatarioAction(id: number): Promise<void> {
    await requirePermiso('configuracion');
    db.prepare('DELETE FROM destinatarios_informe WHERE id = ?').run(id);
    revalidatePath('/configuracion/informes');
}

export async function enviarInformeAhoraAction(): Promise<void> {
    await requirePermiso('configuracion');
    const fecha = fechaAR();
    // Para probar: se genera con clave distinta para poder repetirlo
    db.prepare("DELETE FROM mensajes WHERE tipo = 'informe_diario' AND clave_unica LIKE ? AND estado != 'enviado'").run(`informe:${fecha}:%`);
    const n = generarInformesDelDia(fecha);
    await tick();
    redirect(`/configuracion/informes?generados=${n}`);
}

export async function guardarAjustesMensajesAction(formData: FormData): Promise<void> {
    await requirePermiso('configuracion');
    const claves = ['informe_hora', 'informe_activo', 'mensajes_activos', 'recordatorio_service_activo', 'recordatorio_service_dias', 'proximo_service_meses', 'turno_recordatorio_horas', 'plantilla_recibimos', 'plantilla_listo', 'plantilla_service', 'plantilla_turno'];
    const up = db.prepare("INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor");
    for (const k of claves) {
        if (['informe_activo', 'mensajes_activos', 'recordatorio_service_activo'].includes(k)) up.run(k, formData.get(k) ? '1' : '0');
        else if (formData.has(k)) {
            const v = String(formData.get(k) || '').trim();
            if (k === 'informe_hora' && !/^\d{2}:\d{2}$/.test(v)) continue;
            up.run(k, v);
        }
    }
    revalidatePath('/configuracion/informes');
    redirect('/configuracion/informes?ok=1');
}
