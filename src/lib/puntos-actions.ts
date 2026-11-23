'use server';

import db from './db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requirePermiso, puedeVerSucursal } from './auth';
import { canjearPuntos, configPuntos } from './puntos';

export async function canjearPuntosOrdenAction(ordenId: number, formData: FormData): Promise<void> {
    const ses = await requirePermiso('puntos.canje');
    const o = db.prepare('SELECT o.id, o.sucursal_id, v.cliente_id FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id WHERE o.id = ?').get(ordenId) as any;
    if (!o || !puedeVerSucursal(ses, o.sucursal_id)) throw new Error('Orden no encontrada');
    const cfgP = configPuntos();
    const pts = Math.floor(Number(formData.get('puntos_canje')) || 0);
    if (!cfgP.canje_habilitado) redirect(`/ordenes/${ordenId}/canje?error=deshabilitado`);
    if (pts < (cfgP.puntos_minimos_canje || 0)) redirect(`/ordenes/${ordenId}/canje?error=minimo`);
    const r = canjearPuntos(o.cliente_id, pts, o.sucursal_id, `Canje de puntos - orden #${ordenId} (${ses.nombre})`, ordenId);
    if (!r) redirect(`/ordenes/${ordenId}/canje?error=saldo`);
    revalidatePath('/puntos');
    redirect(`/ordenes/${ordenId}/voucher?puntos=${pts}&anteriores=${r.antes}&restantes=${r.despues}`);
}
