'use server';

import db from './db';
import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermiso } from './auth';
import { fechaAR } from './tiempo';

/** Traspaso de dominio: el historial queda con la patente y pasa al nuevo titular; el anterior conserva sólo lo de su período. */
export async function transferirVehiculoAction(vehiculoId: number, formData: FormData): Promise<void> {
    await requirePermiso('vehiculos.editar');
    const v = db.prepare('SELECT id, patente, cliente_id FROM vehiculos WHERE id = ?').get(vehiculoId) as { id: number; patente: string; cliente_id: number } | undefined;
    if (!v) throw new Error('Vehículo no encontrado');
    const volver = `/vehiculos/${v.patente}`;
    let nuevoId = Number(formData.get('cliente_existente')) || 0;
    if (!nuevoId) {
        const nombre = String(formData.get('nombre') || '').trim();
        const dni = String(formData.get('dni') || '').trim();
        const telefono = String(formData.get('telefono') || '').trim();
        if (!nombre) redirect(`${volver}?error=transfer`);
        // Si ya existe alguien con ese DNI se reutiliza (los clientes se comparten entre sucursales)
        const ya = dni ? db.prepare('SELECT id FROM clientes WHERE dni = ?').get(dni) as { id: number } | undefined : undefined;
        nuevoId = ya?.id ?? Number(db.prepare('INSERT INTO clientes (nombre, dni, telefono) VALUES (?,?,?)').run(nombre, dni || null, telefono || null).lastInsertRowid);
    }
    if (nuevoId === v.cliente_id) redirect(`${volver}?error=mismo`);
    const hoy = fechaAR();
    db.transaction(() => {
        db.prepare('UPDATE vehiculo_propietarios SET hasta = ? WHERE vehiculo_id = ? AND hasta IS NULL').run(hoy, vehiculoId);
        db.prepare('INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde, motivo) VALUES (?,?,?,?)').run(vehiculoId, nuevoId, hoy, 'traspaso');
        db.prepare('UPDATE vehiculos SET cliente_id = ?, cert_token = ? WHERE id = ?').run(nuevoId, crypto.randomBytes(18).toString('base64url'), vehiculoId); // el certificado viejo deja de funcionar
    })();
    revalidatePath(volver);
    redirect(`${volver}?ok=transfer`);
}
