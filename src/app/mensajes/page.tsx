import Link from 'next/link';
import db from '@/lib/db';
import { requireSesion, sucursalesVisibles } from '@/lib/auth';
import { marcarMensajeAction } from '@/lib/mensajes-actions';
import { waConfigurado, smtpConfigurado } from '@/lib/providers';

export const dynamic = 'force-dynamic';
const TIPO: Record<string, string> = { recibimos_auto: 'Recibimos tu auto', auto_listo: 'Tu auto está listo', service_proximo: 'Service por vencer', turno_recordatorio: 'Recordatorio de turno', turno_confirmado: 'Turno confirmado', postventa: 'Consulta postventa', informe_diario: 'Informe del día' };
const EST: Record<string, string> = { pendiente: 'badge-espera', manual: 'badge-espera', enviado: 'badge-terminada', error: 'badge-error', descartado: '' };

export default async function MensajesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
    const ses = await requireSesion('mensajes');
    const { estado = 'manual' } = await searchParams;
    const sucs = sucursalesVisibles(ses);
    const filas = db.prepare(`SELECT m.*, c.nombre cliente FROM mensajes m LEFT JOIN clientes c ON c.id = m.cliente_id
        WHERE (m.sucursal_id IS NULL OR m.sucursal_id IN (${sucs.map(() => '?').join(',')})) ${estado === 'todos' ? '' : 'AND m.estado = ?'} ORDER BY m.id DESC LIMIT 100`)
        .all(...sucs, ...(estado === 'todos' ? [] : [estado])) as any[];
    const cuentas = db.prepare(`SELECT estado, COUNT(*) c FROM mensajes GROUP BY estado`).all() as { estado: string; c: number }[];
    const n = (e: string) => cuentas.find(x => x.estado === e)?.c ?? 0;
    const tab = (e: string, label: string) => <Link key={e} href={`/mensajes?estado=${e}`} className="btn-primary" style={{ background: estado === e ? undefined : 'var(--glass-bg)', color: estado === e ? undefined : 'white', border: '1px solid var(--glass-border)', padding: '.35rem .9rem', fontSize: '.85rem' }}>{label}{e !== 'todos' ? ` (${n(e)})` : ''}</Link>;
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1rem' }}>
            <div className="page-header" style={{ width: '100%' }}><div><h1 className="page-title">Mensajes a clientes</h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>
                    {waConfigurado() ? 'WhatsApp automático activo.' : 'WhatsApp automático sin configurar: los mensajes quedan acá listos para mandar con un clic.'} {smtpConfigurado() ? 'Email activo.' : 'Email sin configurar.'}
                </p></div></div>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>{tab('manual', 'Para enviar')}{tab('pendiente', 'En cola')}{tab('error', 'Con error')}{tab('enviado', 'Enviados')}{tab('descartado', 'Descartados')}{tab('todos', 'Todos')}</div>
            <div className="table-container"><table className="data-table">
                <thead><tr><th>Cuándo</th><th>Tipo</th><th>Para</th><th>Mensaje</th><th>Estado</th><th></th></tr></thead>
                <tbody>{filas.length ? filas.map(m => (
                    <tr key={m.id}>
                        <td style={{ fontSize: '.8rem' }}>{m.creado_en}</td>
                        <td>{TIPO[m.tipo] || m.tipo}</td>
                        <td>{m.cliente || m.destino}<br /><span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{m.destino || 'sin teléfono'}</span></td>
                        <td style={{ maxWidth: 380, whiteSpace: 'pre-wrap', fontSize: '.85rem' }}>{m.cuerpo}{m.error ? <div style={{ color: '#f87171', fontSize: '.75rem' }}>{m.error}</div> : null}</td>
                        <td><span className={`badge ${EST[m.estado]}`}>{m.estado}</span></td>
                        <td><div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                            {m.canal === 'whatsapp' && m.destino && ['manual', 'pendiente', 'error'].includes(m.estado) && <a href={`https://wa.me/${m.destino}?text=${encodeURIComponent(m.cuerpo)}`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '.3rem .7rem', fontSize: '.8rem', background: 'rgba(37,211,102,.15)', color: '#25D366', border: '1px solid rgba(37,211,102,.3)' }}>Abrir WhatsApp</a>}
                            {['manual', 'pendiente', 'error'].includes(m.estado) && <form action={marcarMensajeAction.bind(null, m.id, 'enviado')}><button className="btn-primary" style={{ padding: '.3rem .7rem', fontSize: '.8rem' }}>Ya lo envié</button></form>}
                            {['manual', 'pendiente', 'error'].includes(m.estado) && <form action={marcarMensajeAction.bind(null, m.id, 'descartado')}><button className="btn-primary" style={{ padding: '.3rem .7rem', fontSize: '.8rem', background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}>Descartar</button></form>}
                            {m.estado === 'error' && <form action={marcarMensajeAction.bind(null, m.id, 'pendiente')}><button className="btn-primary" style={{ padding: '.3rem .7rem', fontSize: '.8rem' }}>Reintentar</button></form>}
                        </div></td>
                    </tr>)) : <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay mensajes en esta lista.</td></tr>}</tbody>
            </table></div>
        </main>
    );
}
