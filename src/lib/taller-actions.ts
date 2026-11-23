'use server';

import db from './db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermiso, puedeVerSucursal } from './auth';
import { leerFormOrden } from './orden-form';
import { guardarArchivo, guardarBuffer, dataUrlAPng, Categoria } from './files';
import { acreditarPuntosOrden } from './puntos';
import { encolarMensajeCliente } from './mensajes';
import { fechaAR, horaAR, sumarMeses } from './tiempo';
import { cfg } from './mensajes';

const FOTOS: Categoria[] = ['foto_frente', 'foto_trasera', 'foto_lateral_izq', 'foto_lateral_der', 'foto_tablero'];

async function adjuntarFotos(f: FormData, ordenId: number, usuarioId: number) {
    for (const cat of FOTOS) {
        const file = f.get(cat);
        if (file instanceof File && file.size > 0) await guardarArchivo(file, cat, { ordenId }, usuarioId);
    }
    const pdf = f.get('presupuesto_pdf');
    if (pdf instanceof File && pdf.size > 0) await guardarArchivo(pdf, 'presupuesto_pdf', { ordenId }, usuarioId);
    for (const x of f.getAll('archivos')) {
        if (x instanceof File && x.size > 0) await guardarArchivo(x, 'otro', { ordenId }, usuarioId);
    }
}

/** Abre una orden nueva: queda "en proceso", se registra la hora real de inicio y se avisa al cliente que recibimos su auto. */
export async function abrirOrdenAction(formData: FormData): Promise<void> {
    const ses = await requirePermiso('ordenes.abrir');
    const d = leerFormOrden(formData);
    if (!d.vehiculo_id) throw new Error('Elegí el vehículo.');
    const veh = db.prepare('SELECT id, cliente_id FROM vehiculos WHERE id = ?').get(d.vehiculo_id) as { id: number; cliente_id: number } | undefined;
    if (!veh) throw new Error('El vehículo no existe.');

    const sucursal_id = Number(formData.get('sucursal_id')) || ses.sucursalActivaId || ses.sucursales[0]?.id;
    if (!sucursal_id || !puedeVerSucursal(ses, sucursal_id)) throw new Error('Elegí una sucursal válida (arriba a la izquierda).');

    // Si ese vehículo ya tiene una orden abierta en la sucursal, se sigue esa en vez de duplicar
    const abierta = db.prepare(`SELECT id FROM ordenes_trabajo WHERE vehiculo_id = ? AND sucursal_id = ? AND estado = 'en_proceso' ORDER BY id DESC LIMIT 1`).get(veh.id, sucursal_id) as { id: number } | undefined;
    if (abierta) redirect(`/ordenes/${abierta.id}?duplicada=1`);

    const turnoId = Number(formData.get('turno_id')) || null;
    const ahora = new Date();
    const id = Number(db.prepare(`
        INSERT INTO ordenes_trabajo
          (vehiculo_id, sucursal_id, kilometraje, notas, total, mecanico, aceite_utilizado, filtros_cambiados, proximo_servicio_km, proximo_servicio_fecha,
           presupuesto_nro, servicios_autos, servicios_camioneta, servicios_camion, complementos, observaciones_cliente, tecnico_asignado, hora_ingreso,
           hora_estimada_fin, observaciones_tecnicas, complementos_adicionales, checklist_calidad, estado, iniciada_at, turno_id, creada_por, usuario_id)
        VALUES (?,?,?,?,0,?,?,?,?,?, ?,?,?,?,?,?,?,?, ?,?,?,?, 'en_proceso', ?, ?, ?, ?)`)
        .run(veh.id, sucursal_id, d.kilometraje, d.observaciones_cliente, d.tecnico_asignado, d.aceite, d.filtros, d.proximo_servicio_km, d.proximo_servicio_fecha,
            d.presupuesto_nro, d.servicios_autos, d.servicios_camioneta, d.servicios_camion, d.complementos, d.observaciones_cliente, d.tecnico_asignado, horaAR(ahora),
            d.hora_estimada_fin, d.observaciones_tecnicas, d.complementos_adicionales, d.checklist, ahora.toISOString(), turnoId, ses.id, ses.id).lastInsertRowid);

    if (turnoId) db.prepare(`UPDATE turnos SET estado = 'en_proceso', orden_id = ? WHERE id = ? AND estado = 'en_espera'`).run(id, turnoId);
    // El PDF de presupuesto adjuntado al turno pasa a estar visible también en la orden
    if (turnoId) db.prepare(`UPDATE archivos SET orden_id = ? WHERE turno_id = ? AND categoria = 'presupuesto_pdf' AND orden_id IS NULL`).run(id, turnoId);

    let errorArchivos = '';
    try { await adjuntarFotos(formData, id, ses.id); } catch (e: any) { errorArchivos = e.message || 'No se pudo guardar un archivo'; }

    encolarMensajeCliente('recibimos_auto', { cliente_id: veh.cliente_id, orden_id: id, sucursal_id }, `recibimos:${id}`);
    revalidatePath('/ordenes'); revalidatePath('/agenda');
    redirect(`/ordenes/${id}${errorArchivos ? `?aviso=${encodeURIComponent(errorArchivos)}` : ''}`);
}

/** Edición de datos de una orden (queda registrada quién y por qué). */
export async function editarOrdenAction(id: number, formData: FormData): Promise<void> {
    const ses = await requirePermiso('ordenes.editar');
    const o = db.prepare('SELECT id, sucursal_id FROM ordenes_trabajo WHERE id = ?').get(id) as { id: number; sucursal_id: number } | undefined;
    if (!o || !puedeVerSucursal(ses, o.sucursal_id)) throw new Error('Orden no encontrada.');
    const d = leerFormOrden(formData);
    if (!d.vehiculo_id) throw new Error('Elegí el vehículo.');
    const causa = String(formData.get('modificacion_causa') || '').trim();
    if (!causa) throw new Error('Indicá la causa de la modificación.');
    db.transaction(() => {
        db.prepare(`UPDATE ordenes_trabajo SET vehiculo_id=?, kilometraje=?, notas=?, mecanico=?, aceite_utilizado=?, filtros_cambiados=?, proximo_servicio_km=?, proximo_servicio_fecha=?,
                    presupuesto_nro=?, servicios_autos=?, servicios_camioneta=?, servicios_camion=?, complementos=?, observaciones_cliente=?, tecnico_asignado=?,
                    hora_estimada_fin=?, observaciones_tecnicas=?, complementos_adicionales=?, checklist_calidad=? WHERE id=?`)
            .run(d.vehiculo_id, d.kilometraje, d.observaciones_cliente, d.tecnico_asignado, d.aceite, d.filtros, d.proximo_servicio_km, d.proximo_servicio_fecha,
                d.presupuesto_nro, d.servicios_autos, d.servicios_camioneta, d.servicios_camion, d.complementos, d.observaciones_cliente, d.tecnico_asignado,
                d.hora_estimada_fin, d.observaciones_tecnicas, d.complementos_adicionales, d.checklist, id);
        db.prepare('INSERT INTO modificaciones_orden (orden_id, usuario_nombre, causa) VALUES (?,?,?)').run(id, ses.nombre, causa);
    })();
    try { await adjuntarFotos(formData, id, ses.id); } catch { /* los archivos se pueden volver a subir */ }
    revalidatePath('/ordenes'); revalidatePath(`/ordenes/${id}`);
    redirect(`/ordenes/${id}`);
}

/** Cierra la orden: firma digital, próximo service, puntos (una vez) y aviso "tu auto está listo". */
export async function cerrarOrdenAction(id: number, formData: FormData): Promise<void> {
    const ses = await requirePermiso('ordenes.cerrar');
    const o = db.prepare(`SELECT o.*, v.cliente_id FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id WHERE o.id = ?`).get(id) as any;
    if (!o || !puedeVerSucursal(ses, o.sucursal_id)) throw new Error('Orden no encontrada.');
    if (o.estado === 'terminada') redirect(`/ordenes/${id}`);

    const firma = String(formData.get('firma_cliente') || '');
    const motivoSinFirma = String(formData.get('sin_firma_motivo') || '').trim();
    const png = dataUrlAPng(firma);
    if (!png && !motivoSinFirma) redirect(`/ordenes/${id}/cerrar?error=firma`);

    const hoy = fechaAR();
    const proxFecha = String(formData.get('proximo_servicio_fecha') || '').trim() || o.proximo_servicio_fecha || sumarMeses(hoy, Number(cfg('proximo_service_meses', '6')) || 6);
    const proxKm = Number(formData.get('proximo_servicio_km')) || o.proximo_servicio_km || null;
    const kmSalida = Number(formData.get('kilometraje')) || o.kilometraje || null;
    const obs = String(formData.get('observaciones_tecnicas') || '').trim();
    const ahora = new Date();

    let firmaRef: string | null = null;
    if (png) { const aid = guardarBuffer(png, 'png', 'image/png', 'firma.png', 'firma', { ordenId: id }, ses.id); firmaRef = `/api/archivos/${aid}`; }
    try {
        const foto = formData.get('foto_salida');
        if (foto instanceof File && foto.size > 0) await guardarArchivo(foto, 'foto_salida', { ordenId: id }, ses.id);
    } catch { /* la foto de salida es opcional */ }

    db.transaction(() => {
        db.prepare(`UPDATE ordenes_trabajo SET estado='terminada', cerrada_at=?, cerrada_por=?, hora_fin_real=?, firma_cliente=?, firma_at=?, kilometraje=?,
                    proximo_servicio_fecha=?, proximo_servicio_km=?, observaciones_tecnicas = CASE WHEN ? != '' THEN ? ELSE observaciones_tecnicas END,
                    notas = CASE WHEN ? != '' THEN COALESCE(notas,'') || CASE WHEN notas IS NULL OR notas = '' THEN '' ELSE ' | ' END || 'Sin firma: ' || ? ELSE notas END
                    WHERE id=? AND estado != 'terminada'`)
            .run(ahora.toISOString(), ses.id, horaAR(ahora), firmaRef, png ? ahora.toISOString() : null, kmSalida, proxFecha, proxKm, obs, obs, motivoSinFirma, motivoSinFirma, id);
        db.prepare(`UPDATE turnos SET estado='terminada' WHERE orden_id = ?`).run(id);
        acreditarPuntosOrden(id);
    })();

    encolarMensajeCliente('auto_listo', { cliente_id: o.cliente_id, orden_id: id, sucursal_id: o.sucursal_id }, `listo:${id}`);
    revalidatePath('/ordenes'); revalidatePath(`/ordenes/${id}`); revalidatePath('/agenda');
    redirect(`/ordenes/${id}?cerrada=1`);
}
