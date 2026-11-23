import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { requireSesion, puedeVerSucursal } from '@/lib/auth';
import { cerrarOrdenAction } from '@/lib/taller-actions';
import SignatureCanvas from '@/components/SignatureCanvas';
import FotoCapture from '@/components/FotoCapture';
import { cfg } from '@/lib/mensajes';
import { fechaAR, sumarMeses } from '@/lib/tiempo';

export const dynamic = 'force-dynamic';

export default async function CerrarOrden({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
    const ses = await requireSesion('ordenes.cerrar');
    const id = parseInt((await params).id);
    const o = db.prepare(`SELECT o.*, v.patente, c.nombre cliente_nombre FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN clientes c ON c.id = v.cliente_id WHERE o.id = ?`).get(id) as any;
    if (!o || !puedeVerSucursal(ses, o.sucursal_id)) notFound();
    if (o.estado === 'terminada') redirect(`/ordenes/${id}`);
    const { error } = await searchParams;
    const meses = Number(cfg('proximo_service_meses', '6')) || 6;
    const sugerida = o.proximo_servicio_fecha || sumarMeses(fechaAR(), meses);
    const accion = cerrarOrdenAction.bind(null, id);

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div><h1 className="page-title">Terminar orden #{String(id).padStart(4, '0')} · {o.patente}</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>{o.cliente_nombre} · al terminar se suman los puntos y se avisa al cliente.</p></div>
            </div>
            <form action={accion} className="hero-glass" style={{ maxWidth: 760, width: '100%', textAlign: 'left', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {error === 'firma' && <p style={{ color: '#f87171' }}>⚠️ Falta la firma del cliente (o indicá por qué no firmó).</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
                    <div className="form-group"><label>Kilometraje al salir</label><input className="form-input" type="number" name="kilometraje" defaultValue={o.kilometraje ?? ''} inputMode="numeric" /></div>
                    <div className="form-group"><label>Próximo service (fecha)</label><input className="form-input" type="date" name="proximo_servicio_fecha" defaultValue={sugerida} /></div>
                    <div className="form-group"><label>Próximo service (km)</label><input className="form-input" type="number" name="proximo_servicio_km" defaultValue={o.proximo_servicio_km ?? ''} inputMode="numeric" /></div>
                </div>
                <div className="form-group"><label>Observaciones técnicas (opcional)</label><textarea className="form-input" name="observaciones_tecnicas" rows={3} defaultValue={o.observaciones_tecnicas || ''} /></div>
                <div style={{ maxWidth: 220 }}><FotoCapture name="foto_salida" label="Foto de salida (opcional)" /></div>
                <div>
                    <h3 style={{ marginBottom: '.4rem' }}>✍️ Firma del cliente (conformidad)</h3>
                    <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.6rem' }}>El cliente declara que se le explicó el trabajo, los productos usados y las observaciones, y se retira conforme.</p>
                    <SignatureCanvas />
                    <details style={{ marginTop: '.6rem', fontSize: '.85rem' }}><summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>El cliente no puede firmar ahora</summary>
                        <input className="form-input" name="sin_firma_motivo" placeholder="Motivo (queda registrado)" style={{ marginTop: '.4rem' }} /></details>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>Terminar orden</button>
            </form>
        </main>
    );
}
