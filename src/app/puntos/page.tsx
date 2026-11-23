import Link from 'next/link';
import db from '@/lib/db';
import { requireSesion, sucursalesVisibles } from '@/lib/auth';
import { fechaAR } from '@/lib/tiempo';

export const dynamic = 'force-dynamic';

export default async function PuntosControl({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
    const ses = await requireSesion('puntos.control');
    const sp = await searchParams;
    const mes = /^\d{4}-\d{2}$/.test(sp.mes || '') ? sp.mes! : fechaAR().slice(0, 7);
    const sucs = sucursalesVisibles(ses);
    const inS = sucs.map(() => '?').join(',');
    const resumen = db.prepare(`SELECT s.nombre, COALESCE(SUM(CASE WHEN h.puntos > 0 THEN h.puntos END),0) acreditados, COALESCE(-SUM(CASE WHEN h.puntos < 0 THEN h.puntos END),0) canjeados, COUNT(CASE WHEN h.puntos < 0 THEN 1 END) nCanjes
        FROM sucursales s LEFT JOIN puntos_historial h ON h.sucursal_id = s.id AND strftime('%Y-%m', h.fecha) = ? WHERE s.id IN (${inS}) GROUP BY s.id ORDER BY s.id`).all(mes, ...sucs) as any[];
    const circulacion = (db.prepare('SELECT COALESCE(SUM(puntos_acumulados),0) c, COUNT(*) n FROM puntos_clientes WHERE puntos_acumulados > 0').get() as any);
    const top = db.prepare(`SELECT c.id, c.nombre, p.puntos_acumulados, p.ultimo_movimiento FROM puntos_clientes p JOIN clientes c ON c.id = p.cliente_id ORDER BY p.puntos_acumulados DESC LIMIT 15`).all() as any[];
    const canjes = db.prepare(`SELECT h.fecha, h.puntos, h.concepto, h.orden_id, c.id cid, c.nombre, s.nombre sucursal FROM puntos_historial h JOIN clientes c ON c.id = h.cliente_id LEFT JOIN sucursales s ON s.id = h.sucursal_id
        WHERE h.puntos < 0 AND (h.sucursal_id IS NULL OR h.sucursal_id IN (${inS})) ORDER BY h.id DESC LIMIT 30`).all(...sucs) as any[];
    const totA = resumen.reduce((s, r) => s + r.acreditados, 0), totC = resumen.reduce((s, r) => s + r.canjeados, 0);
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1rem' }}>
            <div className="page-header" style={{ width: '100%' }}><div><h1 className="page-title">Control de puntos</h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>Cuántos puntos se otorgaron y se canjearon, y cuánto hay en circulación. El cobro y la caja se llevan en Boxer.</p></div>
                <form style={{ display: 'flex', gap: '.4rem' }}><input type="month" name="mes" defaultValue={mes} className="form-input" /><button className="btn-primary">Ver</button></form></div>
            <div className="card-grid">
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Otorgados en {mes}</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80' }}>+{totA.toLocaleString('es-AR')}</div></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Canjeados en {mes}</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171' }}>−{totC.toLocaleString('es-AR')}</div></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>En circulación (pendientes de canje)</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>{circulacion.c.toLocaleString('es-AR')}</div><div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{circulacion.n.toLocaleString('es-AR')} clientes con saldo</div></div>
            </div>
            <div className="table-container"><table className="data-table"><thead><tr><th>Sucursal</th><th>Otorgados</th><th>Canjeados</th><th>Nº de canjes</th></tr></thead>
                <tbody>{resumen.map(r => <tr key={r.nombre}><td>{r.nombre}</td><td>{r.acreditados.toLocaleString('es-AR')}</td><td>{r.canjeados.toLocaleString('es-AR')}</td><td>{r.nCanjes}</td></tr>)}</tbody></table></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1rem', width: '100%' }}>
                <div className="table-container"><h3 style={{ padding: '1rem 1rem 0' }}>Mayores saldos</h3><table className="data-table"><thead><tr><th>Cliente</th><th>Puntos</th><th>Último mov.</th></tr></thead>
                    <tbody>{top.map(t => <tr key={t.id}><td><Link href={`/clientes/${t.id}`} style={{ color: 'var(--accent)' }}>{t.nombre}</Link></td><td>{t.puntos_acumulados.toLocaleString('es-AR')}</td><td style={{ fontSize: '.8rem' }}>{String(t.ultimo_movimiento || '').slice(0, 10)}</td></tr>)}</tbody></table></div>
                <div className="table-container"><h3 style={{ padding: '1rem 1rem 0' }}>Últimos canjes</h3><table className="data-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Pts</th><th>Sucursal</th></tr></thead>
                    <tbody>{canjes.length ? canjes.map((c, i) => <tr key={i}><td style={{ fontSize: '.8rem' }}>{String(c.fecha).slice(0, 10)}</td><td><Link href={`/clientes/${c.cid}`} style={{ color: 'var(--accent)' }}>{c.nombre}</Link></td><td style={{ color: '#f87171' }}>{c.puntos}</td><td>{c.sucursal}</td></tr>) : <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>Todavía no hubo canjes.</td></tr>}</tbody></table></div>
            </div>
        </main>
    );
}
