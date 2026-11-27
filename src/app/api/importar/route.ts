import { NextResponse } from 'next/server';
import fs from 'fs';
import { getSesion, can } from '@/lib/auth';
import { guardarPendiente, importarDelta, RUTA_PENDIENTE } from '@/lib/importar-base';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
    const ses = await getSesion();
    if (!ses || !can(ses.rol, 'configuracion')) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    try {
        const form = await request.formData();
        const modo = String(form.get('modo') || 'vista');
        if (modo === 'vista') {
            const f = form.get('archivo');
            if (!(f instanceof File) || f.size < 1000) return NextResponse.json({ error: 'Elegí el archivo nozieres.db' }, { status: 400 });
            if (f.size > 200 * 1024 * 1024) return NextResponse.json({ error: 'El archivo es demasiado grande' }, { status: 400 });
            guardarPendiente(Buffer.from(await f.arrayBuffer()));
            return NextResponse.json(importarDelta(RUTA_PENDIENTE, false));
        }
        if (!fs.existsSync(RUTA_PENDIENTE)) return NextResponse.json({ error: 'Subí el archivo de nuevo para ver la vista previa.' }, { status: 400 });
        const r = importarDelta(RUTA_PENDIENTE, true);
        if (r.ok) { for (const ext of ['', '-wal', '-shm']) { try { fs.unlinkSync(RUTA_PENDIENTE + ext); } catch { /* */ } } }
        return NextResponse.json(r);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 });
    }
}
