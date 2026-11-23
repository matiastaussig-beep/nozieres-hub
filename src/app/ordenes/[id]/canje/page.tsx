import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import db from '@/lib/db';
import { requireSesion, puedeVerSucursal } from '@/lib/auth';
import { configPuntos } from '@/lib/puntos';
import { canjearPuntosOrdenAction } from '@/lib/puntos-actions';

export const dynamic = 'force-dynamic';
const ERR: Record<string, string> = { deshabilitado: 'El canje está deshabilitado por administración.', minimo: 'No alcanza el mínimo de puntos para canjear.', saldo: 'El cliente no tiene saldo suficiente.' };

export default async function CanjePuntos({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
    const ses = await requireSesion('puntos.canje');
    const id = Number((await params).id); const { error } = await searchParams;
    const o = db.prepare(`SELECT o.id, o.sucursal_id, o.estado, v.patente, c.id cliente_id, c.nombre, COALESCE(p.puntos_acumulados, 0) puntos
        FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN clientes c ON c.id = v.cliente_id LEFT JOIN puntos_clientes p ON p.cliente_id = c.id WHERE o.id = ?`).get(id) as any;
    if (!o || !puedeVerSucursal(ses, o.sucursal_id)) notFound();
    const cfg = configPuntos();
    const min = cfg.puntos_minimos_canje || 500;
    const historial = db.prepare('SELECT fecha, puntos, concepto FROM puntos_historial WHERE cliente_id = ? ORDER BY id DESC LIMIT 12').all(o.cliente_id) as any[];
    const puede = !!cfg.canje_habilitado && o.puntos >= min;
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', maxWidth: 720, margin: '0 auto', gap: '1rem' }}>
            <div className="page-header" style={{ width: '100%' }}><div>
                <h1 className="page-title">Puntos · orden #{String(id).padStart(4, '0')}</h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>{o.nombre} · {o.patente}</p></div>
                <Link href={`/ordenes/${id}`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><ArrowLeft size={16} /> Volver</Link></div>
            {error && <p style={{ color: '#f87171' }}>⚠️ {ERR[error]}</p>}
            <div className="card" style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Saldo del cliente</div>
                <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fbbf24' }}>⭐ {o.puntos.toLocaleString('es-AR')}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Mínimo para canjear: {min} pts</div>
                {!cfg.canje_habilitado ? <p style={{ color: '#f87171', marginTop: '.6rem' }}>🔒 Canje deshabilitado por administración</p> : puede ? (
                    <form action={canjearPuntosOrdenAction.bind(null, id)} style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '.8rem' }}>
                        <input className="form-input" type="number" name="puntos_canje" defaultValue={min} min={min} max={o.puntos} step={50} style={{ width: 130 }} />
                        <button className="btn-primary" type="submit">Canjear puntos</button>
                    </form>
                ) : <p style={{ color: 'var(--text-muted)', marginTop: '.6rem' }}>Le faltan {min - o.puntos} pts para poder canjear.</p>}
            </div>
            <div className="card" style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '.4rem' }}>Últimos movimientos</h3>
                {historial.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '.25rem 0', borderTop: '1px solid var(--glass-border)' }}><span>{m.concepto}</span><b style={{ color: m.puntos > 0 ? '#4ade80' : '#f87171' }}>{m.puntos > 0 ? '+' : ''}{m.puntos}</b></div>)}
            </div>
        </main>
    );
}
