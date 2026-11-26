import Link from 'next/link';
import { PlusCircle, FileText, Edit, Clock, ChevronLeft, ChevronRight, Eye, CheckCircle2, PackageSearch } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import { requireSesion, sucursalesVisibles, can } from '@/lib/auth';
import { listarOrdenes, duracionMin, fmtDur, ESTADO_CLASE, ESTADO_LABEL } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
    const ses = await requireSesion('ordenes.ver');
    const sp = await searchParams;
    const q = sp.q || '', estado = sp.estado || '', page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
    const { rows, total, pages } = listarOrdenes({ sucursales: sucursalesVisibles(ses), q, estado, page });
    const url = (p: number, e = estado) => { const u = new URLSearchParams(); if (q) u.set('q', q); if (e) u.set('estado', e); u.set('page', String(p)); return `/ordenes?${u}`; };
    const tab = (e: string, label: string) => (
        <Link href={url(1, e)} className="btn-primary" style={{ background: estado === e ? undefined : 'var(--glass-bg)', color: estado === e ? undefined : 'white', border: '1px solid var(--glass-border)', padding: '.35rem .9rem', fontSize: '.85rem' }}>{label}</Link>
    );
    const consolidado = !ses.sucursalActivaId;

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Órdenes de trabajo</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>{total.toLocaleString('es-AR')} órdenes · las que están en proceso aparecen primero.</p>
                </div>
                {can(ses.rol, 'ordenes.abrir') && <Link href="/ordenes/nueva" className="btn-primary"><PlusCircle size={18} /> Nueva orden</Link>}
            </div>
            <div className="table-container">
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '.6rem', flexWrap: 'wrap', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
                    <SearchInput />
                    {tab('', 'Todas')}{tab('en_proceso', 'En proceso')}{tab('terminada', 'Terminadas')}
                </div>
                <table className="data-table">
                    <thead><tr><th>OT</th><th>Fecha</th><th>Vehículo / Cliente</th><th>Técnico</th>{consolidado && <th>Sucursal</th>}<th>Estado</th><th>Duración</th><th></th></tr></thead>
                    <tbody>
                        {rows.length ? rows.map(ot => (
                            <tr key={ot.id}>
                                <td style={{ color: 'var(--text-muted)' }}>#{String(ot.id).padStart(4, '0')}</td>
                                <td>{new Date(ot.fecha.replace(' ', 'T') + (ot.fecha.includes('Z') ? '' : 'Z')).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Jujuy' })}</td>
                                <td><Link href={`/vehiculos/${ot.vehiculo_patente}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>{ot.vehiculo_patente}</Link><br /><span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{ot.cliente_nombre}</span></td>
                                <td>{ot.tecnico_asignado || '-'}</td>
                                {consolidado && <td>{ot.sucursal_nombre}</td>}
                                <td><span className={`badge ${ESTADO_CLASE[ot.estado] || ''}`}>{ESTADO_LABEL[ot.estado] || ot.estado}</span></td>
                                <td><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Clock size={12} /> {fmtDur(duracionMin(ot))}</span></td>
                                <td><div style={{ display: 'flex', gap: '.4rem' }}>
                                    <Link href={`/ordenes/${ot.id}`} className="btn-primary" style={{ padding: '.35rem .7rem', fontSize: '.8rem' }}><Eye size={14} /> Ver</Link>
                                    {ot.estado === 'en_proceso' && <Link href={`/ordenes/${ot.id}#firma`} className="btn-primary" style={{ padding: '.35rem .7rem', fontSize: '.8rem', background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,.35)' }}><CheckCircle2 size={14} /> Terminar</Link>}
                                    <Link href={`/ordenes/${ot.id}/imprimir`} className="btn-primary" style={{ padding: '.35rem .7rem', fontSize: '.8rem', background: 'rgba(255,255,255,.05)', color: 'white', border: '1px solid var(--glass-border)' }}><FileText size={14} /></Link>
                                    <Link href={`/ordenes/${ot.id}/caja`} title="Control de caja" className="btn-primary" style={{ padding: '.35rem .7rem', fontSize: '.8rem', background: 'rgba(59,130,246,.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)' }}><PackageSearch size={14} /> Caja</Link>
                                    {can(ses.rol, 'ordenes.editar') && <Link href={`/ordenes/${ot.id}/editar`} className="btn-primary" style={{ padding: '.35rem .7rem', fontSize: '.8rem', background: 'rgba(255,215,0,.1)', color: 'var(--accent)', border: '1px solid rgba(255,215,0,.2)' }}><Edit size={14} /></Link>}
                                </div></td>
                            </tr>
                        )) : <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay órdenes para mostrar.</td></tr>}
                    </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', gap: '.5rem' }}>
                    <Link href={url(page - 1)} className="btn-primary" style={{ opacity: page <= 1 ? .4 : 1, pointerEvents: page <= 1 ? 'none' : 'auto' }}><ChevronLeft size={16} /> Anterior</Link>
                    <span style={{ alignSelf: 'center' }}>Página {page} de {pages}</span>
                    <Link href={url(page + 1)} className="btn-primary" style={{ opacity: page >= pages ? .4 : 1, pointerEvents: page >= pages ? 'none' : 'auto' }}>Siguiente <ChevronRight size={16} /></Link>
                </div>
            </div>
        </main>
    );
}
