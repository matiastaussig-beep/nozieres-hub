import Link from 'next/link';
import { requireSesion, sucursalesVisibles } from '@/lib/auth';
import { productividad } from '@/lib/productividad';
import { fmtDur } from '@/lib/queries';
import { fechaAR } from '@/lib/tiempo';

export const dynamic = 'force-dynamic';

export default async function Informes({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
    const ses = await requireSesion('informes');
    const sp = await searchParams;
    const hoy = fechaAR();
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const desde = re.test(sp.desde || '') ? sp.desde! : hoy.slice(0, 8) + '01';
    const hasta = re.test(sp.hasta || '') ? sp.hasta! : hoy;
    const sucs = sucursalesVisibles(ses);
    const p = productividad({ desde, hasta, sucursales: sucs });
    const color = (pct: number | null) => pct === null ? 'var(--text-muted)' : pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171';
    const alcance = ses.sucursalActivaId ? ses.sucursales.find(s => s.id === ses.sucursalActivaId)?.nombre : 'Todas las sucursales (consolidado)';
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1rem' }}>
            <div className="page-header" style={{ width: '100%' }}><div><h1 className="page-title">Productividad</h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>{alcance} · del {desde} al {hasta}</p></div>
                <form style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" type="date" name="desde" defaultValue={desde} /><input className="form-input" type="date" name="hasta" defaultValue={hasta} />
                    <button className="btn-primary">Ver</button>
                    <Link className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }} href={`/api/reports/excel?inicio=${desde}&fin=${hasta}`}>Excel</Link></form></div>
            <div className="card-grid">
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Servicios terminados</div><div style={{ fontSize: '2rem', fontWeight: 800 }}>{p.total.toLocaleString('es-AR')}</div></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Tiempo promedio / mediana</div><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{fmtDur(p.promMin)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {fmtDur(p.medianaMin)}</span></div></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Terminados en tiempo estándar</div><div style={{ fontSize: '2rem', fontWeight: 800, color: color(p.enTiempoPct) }}>{p.enTiempoPct ?? '-'}{p.enTiempoPct !== null && '%'}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Estándar: auto {p.estandares.auto}′ · camioneta {p.estandares.camioneta}′ · camión {p.estandares.camion}′ (+10%)</div></div>
                {p.porSucursal.length > 1 && <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Por sucursal</div>{p.porSucursal.map(s => <div key={s.nombre} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{s.nombre}</span><b>{s.n}</b></div>)}</div>}
            </div>
            <div className="table-container"><table className="data-table">
                <thead><tr><th>Técnico</th><th>Órdenes</th><th>Por día activo</th><th>Tiempo prom.</th><th>Mediana</th><th>vs estándar</th><th>En tiempo</th><th>Horas trabajadas</th><th>Mix (auto/camioneta/camión)</th></tr></thead>
                <tbody>{p.tecnicos.map(t => (
                    <tr key={t.tecnico}><td><b>{t.tecnico}</b></td><td>{t.ordenes}</td><td>{t.ordenesPorDia}</td><td>{fmtDur(t.promMin)}</td><td>{fmtDur(t.medianaMin)}</td>
                        <td style={{ color: t.desvioMin === null ? undefined : t.desvioMin <= 0 ? '#4ade80' : '#f87171' }}>{t.desvioMin === null ? '-' : `${t.desvioMin > 0 ? '+' : ''}${t.desvioMin} min`}</td>
                        <td style={{ color: color(t.enTiempoPct), fontWeight: 700 }}>{t.enTiempoPct === null ? '-' : `${t.enTiempoPct}%`}</td>
                        <td>{(t.minutosTotales / 60).toFixed(1)} h</td><td>{t.porTipo.auto || 0} / {t.porTipo.camioneta || 0} / {t.porTipo.camion || 0}</td></tr>))}
                    {!p.tecnicos.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay servicios terminados en este período.</td></tr>}</tbody>
            </table></div>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Una orden hecha por dos técnicos cuenta para cada uno. Desde ahora el tiempo se mide con el reloj real de “abrir” y “terminar” la orden (antes se anotaba a mano la hora).</p>
            <div className="card" style={{ width: '100%' }}><h3 style={{ marginBottom: '.5rem' }}>Servicios más pedidos</h3>
                {p.topServicios.map(([n, c]) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.9rem', padding: '.2rem 0' }}><span>{n}</span><b>{c}</b></div>)}</div>
        </main>
    );
}
