import { tick } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

/** Disparo externo opcional de las tareas automáticas (por si un día se prefiere un cron del servidor). */
export async function POST(req: Request) {
    const clave = process.env.CRON_SECRET;
    if (!clave || req.headers.get('authorization') !== `Bearer ${clave}`) return new Response('No autorizado', { status: 401 });
    await tick();
    return Response.json({ ok: true });
}
