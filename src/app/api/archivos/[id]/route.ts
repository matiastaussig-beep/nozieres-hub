import fs from 'fs';
import db from '@/lib/db';
import { getSesion, can, puedeVerSucursal } from '@/lib/auth';
import { rutaAbsoluta } from '@/lib/files';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const ses = await getSesion();
    if (!ses || !can(ses.rol, 'ordenes.ver')) return new Response('No autorizado', { status: 401 });
    const { id } = await ctx.params;
    const a = db.prepare(`SELECT a.*, COALESCE(o.sucursal_id, t.sucursal_id) AS sucursal_id
                          FROM archivos a LEFT JOIN ordenes_trabajo o ON o.id = a.orden_id LEFT JOIN turnos t ON t.id = a.turno_id
                          WHERE a.id = ?`).get(Number(id)) as any;
    if (!a) return new Response('No existe', { status: 404 });
    if (!puedeVerSucursal(ses, a.sucursal_id)) return new Response('No autorizado', { status: 403 });
    try {
        const buf = fs.readFileSync(rutaAbsoluta(a.ruta));
        return new Response(buf, { headers: { 'Content-Type': a.mime || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': `inline; filename="${encodeURIComponent(a.nombre || 'archivo')}"` } });
    } catch { return new Response('Archivo no disponible', { status: 404 }); }
}
