import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Chequeo de salud para el monitor externo: responde 200 sólo si la base contesta. */
export async function GET() {
    try {
        const o = db.prepare('SELECT COUNT(*) c FROM ordenes_trabajo').get() as { c: number };
        const err = (db.prepare("SELECT COUNT(*) c FROM mensajes WHERE estado = 'error'").get() as { c: number }).c;
        return Response.json({ ok: true, ordenes: o.c, mensajes_con_error: err, hora: new Date().toISOString() });
    } catch (e: any) {
        return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
}
