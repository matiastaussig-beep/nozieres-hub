import Link from 'next/link';
import { PlusCircle, ChevronLeft, ChevronRight, FileText, Play, Clock, Car } from 'lucide-react';
import db from '@/lib/db';
import { requireSesion, sucursalesVisibles, can } from '@/lib/auth';
import { fechaAR, sumarDias } from '@/lib/tiempo';
import { ESTADO_CLASE, ESTADO_LABEL } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; ok?: string; error?: string }> }) {
    const ses = await requireSesion('agenda.ver');
    const sp = await searchParams;
    const hoy = fechaAR();
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha || '') ? sp.fecha! : hoy;
    const sucs = sucursalesVisibles(ses);
    const turnos = db.prepare(`
        SELECT t.*, v.patente, v.marca, v.modelo, c.nombre cliente_nombre, c.telefono, s.nombre sucursal_nombre,
               (SELECT COUNT(*) FROM archivos a WHERE a.turno_id = t.id AND a.categoria = 'presupuesto_pdf') pdfs
        FROM turnos t LEFT JOIN vehiculos v ON v.id = t.vehiculo_id LEFT JOIN clientes c ON c.id = t.cliente_id LEFT JOIN sucursales s ON s.id = t.sucursal_id
        WHERE t.fecha = ? AND t.sucursal_id IN (${sucs.map(() => '?').join(',')})
        ORDER BY CASE t.estado WHEN 'en_proceso' THEN 0 WHEN 'en_espera' THEN 1 ELSE 2 END, COALESCE(t.hora, '99:99')`).all(fecha, ...sucs) as any[];
    // Órdenes abiertas hoy sin turno también se muestran en la agenda como "en proceso"
    const sinTurno = fecha === hoy ? db.prepare(`
        SELECT o.id, o.tecnico_asignado, o.hora_ingreso, o.presupuesto_nro, v.patente, v.marca, v.modelo, c.nombre cliente_nombre
        FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN clientes c ON c.id = v.cliente_id
        WHERE o.estado = 'en_proceso' AND o.turno_id IS NULL AND o.sucursal_id IN (${sucs.map(() => '?').join(',')}) ORDER BY o.iniciada_at`).all(...sucs) as any[] : [];
    const cols: [string, string][] = [['en_espera', 'En espera'], ['en_proceso', 'En proceso'], ['terminada', 'Terminada']];
    const fechaLarga = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1rem' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Agenda · <span style={{ textTransform: 'capitalize' }}>{fechaLarga}</span></h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>{turnos.length} turnos · el estado cambia solo al abrir y al terminar la orden.</p>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    <Link href={`/agenda?fecha=${sumarDias(fecha, -1)}`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><ChevronLeft size={16} /></Link>
                    <Link href="/agenda" className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}>Hoy</Link>
                    <Link href={`/agenda?fecha=${sumarDias(fecha, 1)}`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><ChevronRight size={16} /></Link>
                    {can(ses.rol, 'agenda.editar') && <Link href={`/agenda/nuevo?fecha=${fecha}`} className="btn-primary"><PlusCircle size={16} /> Nuevo turno</Link>}
                </div>
            </div>
            {sp.ok && <p style={{ color: '#4ade80' }}>✓ Guardado.</p>}
            {sp.error === 'sucursal' && <p style={{ color: '#f87171' }}>Elegí una sucursal arriba para crear turnos.</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem', width: '100%', alignItems: 'start' }}>
                {cols.map(([est, titulo]) => {
                    const items = turnos.filter(t => t.estado === est);
                    const extra = est === 'en_proceso' ? sinTurno : [];
                    return (
                        <div key={est} className="card">
                            <h3 style={{ marginBottom: '.7rem', display: 'flex', justifyContent: 'space-between' }}><span className={`badge ${ESTADO_CLASE[est]}`}>{titulo}</span><span style={{ color: 'var(--text-muted)' }}>{items.length + extra.length}</span></h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                                {items.map(t => (
                                    <div key={t.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 10, padding: '.6rem .7rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                            <b>{t.patente || 'Sin vehículo'}</b><span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}><Clock size={11} /> {t.hora || 'sin hora'}</span>
                                        </div>
                                        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{[t.marca, t.modelo].filter(Boolean).join(' ')} · {t.cliente_nombre}</div>
                                        {t.motivo && <div style={{ fontSize: '.82rem' }}>{t.motivo}</div>}
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            {t.tecnico ? `🔧 ${t.tecnico}` : ''} {t.presupuesto_nro ? `· Presup. ${t.presupuesto_nro}` : ''} {ses.sucursalActivaId ? '' : `· ${t.sucursal_nombre}`}
                                        </div>
                                        <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
                                            {t.pdfs > 0 && <Link href={`/agenda/${t.id}`} className="btn-primary" style={{ padding: '.25rem .6rem', fontSize: '.78rem' }}><FileText size={12} /> Presupuesto</Link>}
                                            <Link href={`/agenda/${t.id}`} className="btn-primary" style={{ padding: '.25rem .6rem', fontSize: '.78rem', background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}>Detalle</Link>
                                            {t.estado === 'en_espera' && can(ses.rol, 'ordenes.abrir') && <Link href={`/ordenes/nueva?turno=${t.id}`} className="btn-primary" style={{ padding: '.25rem .6rem', fontSize: '.78rem', background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.35)' }}><Play size={12} /> Recibir</Link>}
                                            {t.orden_id && <Link href={`/ordenes/${t.orden_id}`} className="btn-primary" style={{ padding: '.25rem .6rem', fontSize: '.78rem', background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}>Orden #{t.orden_id}</Link>}
                                        </div>
                                    </div>
                                ))}
                                {extra.map(o => (
                                    <div key={`o${o.id}`} style={{ border: '1px dashed var(--glass-border)', borderRadius: 10, padding: '.6rem .7rem' }}>
                                        <b><Car size={13} /> {o.patente}</b> <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>· ingresó {o.hora_ingreso} (sin turno)</span>
                                        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{[o.marca, o.modelo].filter(Boolean).join(' ')} · {o.cliente_nombre}</div>
                                        <Link href={`/ordenes/${o.id}`} className="btn-primary" style={{ marginTop: '.4rem', padding: '.25rem .6rem', fontSize: '.78rem' }}>Orden #{o.id}</Link>
                                    </div>
                                ))}
                                {!items.length && !extra.length && <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>—</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
