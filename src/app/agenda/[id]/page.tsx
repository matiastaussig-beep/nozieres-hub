import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireSesion, puedeVerSucursal, can } from '@/lib/auth';
import { listarArchivos } from '@/lib/files';
import { adjuntarPresupuestoTurnoAction, cancelarTurnoAction, recordarTurnoAction } from '@/lib/agenda-actions';
import { ESTADO_CLASE, ESTADO_LABEL } from '@/lib/queries';
import { fechaCorta } from '@/lib/tiempo';

export const dynamic = 'force-dynamic';

export default async function TurnoDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; aviso?: string }> }) {
    const ses = await requireSesion('agenda.ver');
    const id = Number((await params).id); const sp = await searchParams;
    const t = db.prepare(`SELECT t.*, v.patente, v.marca, v.modelo, c.nombre cliente_nombre, c.telefono, s.nombre sucursal_nombre FROM turnos t
        LEFT JOIN vehiculos v ON v.id = t.vehiculo_id LEFT JOIN clientes c ON c.id = t.cliente_id LEFT JOIN sucursales s ON s.id = t.sucursal_id WHERE t.id = ?`).get(id) as any;
    if (!t || !puedeVerSucursal(ses, t.sucursal_id)) notFound();
    const pdfs = listarArchivos({ turnoId: id }).filter(a => a.categoria === 'presupuesto_pdf');
    const editar = can(ses.rol, 'agenda.editar');
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1rem' }}>
            <div className="page-header" style={{ width: '100%' }}><div>
                <h1 className="page-title">Turno · {t.patente || 'sin vehículo'} <span className={`badge ${ESTADO_CLASE[t.estado]}`}>{ESTADO_LABEL[t.estado]}</span></h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>{fechaCorta(t.fecha)} {t.hora || ''} · {t.sucursal_nombre}</p></div>
                <Link href={`/agenda?fecha=${t.fecha}`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}>Volver a la agenda</Link></div>
            {sp.ok && <p style={{ color: '#4ade80' }}>✓ Guardado.</p>}{sp.aviso && <p style={{ color: '#fbbf24' }}>⚠️ {sp.aviso}</p>}
            <div className="card" style={{ width: '100%' }}>
                <p><b>Cliente:</b> {t.cliente_nombre || '-'} {t.telefono ? `· ${t.telefono}` : ''}</p>
                <p><b>Vehículo:</b> {[t.marca, t.modelo].filter(Boolean).join(' ') || '-'}</p>
                <p><b>Técnico:</b> {t.tecnico || 'sin asignar'}</p>
                <p><b>Motivo:</b> {t.motivo || '-'}</p>{t.notas && <p><b>Notas:</b> {t.notas}</p>}
                <p><b>Presupuesto (Boxer):</b> {t.presupuesto_nro || '—'}</p>
            </div>
            <div className="card" style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '.6rem' }}>Presupuesto en PDF</h3>
                {pdfs.length ? pdfs.map(p => (
                    <details key={p.id} open style={{ marginBottom: '.6rem' }}>
                        <summary><a href={`/api/archivos/${p.id}`} target="_blank" style={{ color: 'var(--accent)' }}>{p.nombre || 'presupuesto.pdf'}</a></summary>
                        <iframe src={`/api/archivos/${p.id}`} title="Presupuesto" style={{ width: '100%', height: 520, border: '1px solid var(--glass-border)', borderRadius: 8, background: '#fff' }} />
                    </details>
                )) : <p style={{ color: 'var(--text-muted)' }}>Todavía no hay PDF adjunto.</p>}
                {editar && t.estado !== 'terminada' && (
                    <form action={adjuntarPresupuestoTurnoAction.bind(null, id)} style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'end', marginTop: '.6rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label>Nº presupuesto</label><input className="form-input" name="presupuesto_nro" defaultValue={t.presupuesto_nro || ''} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label>Adjuntar PDF</label><input type="file" name="presupuesto_pdf" accept="application/pdf" /></div>
                        <button className="btn-primary" type="submit">Guardar</button>
                    </form>
                )}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {t.estado === 'en_espera' && can(ses.rol, 'ordenes.abrir') && <Link href={`/ordenes/nueva?turno=${id}`} className="btn-primary">Recibir vehículo (abrir orden)</Link>}
                {t.orden_id && <Link href={`/ordenes/${t.orden_id}`} className="btn-primary">Ver orden #{t.orden_id}</Link>}
                {editar && t.cliente_id && t.estado === 'en_espera' && <form action={recordarTurnoAction.bind(null, id)}><button className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}>Recordar al cliente</button></form>}
                {editar && t.estado === 'en_espera' && <form action={cancelarTurnoAction.bind(null, id)}><button className="btn-primary" style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>Cancelar turno</button></form>}
            </div>
        </main>
    );
}
