import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Droplet, Filter, Wrench, Award } from 'lucide-react';
import db from '@/lib/db';
import { requireSesion, puedeVerSucursal, can } from '@/lib/auth';
import { getOrdenById } from '@/lib/actions';
import { configPuntos } from '@/lib/puntos';
import { ESTADO_CLASE, ESTADO_LABEL } from '@/lib/queries';
import PrintSummaryButton from '@/components/PrintSummaryButton';

export const dynamic = 'force-dynamic';

function leer<T>(txt: unknown, def: T): T { try { return JSON.parse(String(txt || '')) as T; } catch { return def; } }

export default async function ControlCaja({ params }: { params: Promise<{ id: string }> }) {
    const ses = await requireSesion('ordenes.ver');
    const id = Number((await params).id);
    const orden = await getOrdenById(id);
    if (!orden || !puedeVerSucursal(ses, orden.sucursal_id)) notFound();
    const info = orden as any;

    const cli = db.prepare('SELECT v.cliente_id FROM vehiculos v WHERE v.id = ?').get(info.vehiculo_id) as { cliente_id: number } | undefined;
    const pc = cli ? db.prepare('SELECT puntos_acumulados p FROM puntos_clientes WHERE cliente_id = ?').get(cli.cliente_id) as { p: number } | undefined : undefined;
    const puntos = pc?.p ?? 0;
    const cfg = configPuntos();
    const min = cfg.puntos_minimos_canje || 500;

    const aceite = leer<any>(info.aceite_utilizado, {});
    const filtros = leer<Record<string, string>>(info.filtros_cambiados, {});
    const servicios = [...leer<string[]>(info.servicios_autos, []), ...leer<string[]>(info.servicios_camioneta, []), ...leer<string[]>(info.servicios_camion, [])].filter(Boolean);
    const complementos = leer<string[]>(info.complementos, []).filter(Boolean);

    const aceites = [['Motor', aceite.motor], ['Caja', aceite.caja], ['Diferencial', aceite.diferencial]].filter(([, a]: any) => a?.marca) as [string, any][];
    const filtrosLista = Object.entries({
        'Aceite': filtros.aceite, 'Aire motor': filtros.aire_motor, 'Aire primario': filtros.aire_motor_primario, 'Aire secundario': filtros.aire_motor_secundario,
        'Combustible': filtros.combustible, 'Habitáculo / AA': filtros.habitaculo, 'Desecador': filtros.desecador, 'Trampa de agua': filtros.trampa_agua,
        'Transmisión': filtros.aceite_transmision, 'Agua': filtros.agua, 'Hidráulico': filtros.hidraulico,
    }).filter(([, v]) => !!v);

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', maxWidth: 800, margin: '0 auto', gap: '1rem' }}>
            <div className="page-header no-print" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Control de caja · orden #{String(id).padStart(4, '0')}</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>
                        Cliente: <strong>{info.cliente_nombre}</strong> · Vehículo: <strong>{info.vehiculo_patente?.toUpperCase()}</strong> ({info.vehiculo_marca} {info.vehiculo_modelo}) · KM: <strong>{info.kilometraje || '-'}</strong>
                    </p>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>
                        Estado: <span className={`badge ${ESTADO_CLASE[info.estado] || ''}`}>{ESTADO_LABEL[info.estado] || info.estado}</span> · Técnico: <strong>{info.tecnico || '-'}</strong>
                    </p>
                    <p className="app-subtitle" style={{ marginBottom: 0, fontSize: '.8rem' }}>Sirve para validar lo que se cargó antes de facturar en Boxer. El cobro y la caja se llevan en Boxer.</p>
                </div>
                <Link href={`/ordenes/${id}`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><ArrowLeft size={16} /> Volver</Link>
            </div>

            <div className="card" style={{ width: '100%', borderLeft: '4px solid #3b82f6' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#3b82f6', marginBottom: '.6rem' }}><Droplet size={18} /> Aceites cargados</h3>
                {aceites.length ? aceites.map(([nombre, a]) => (
                    <div key={nombre} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem 0', borderTop: '1px solid var(--glass-border)' }}>
                        <span><strong>{nombre}:</strong> {a.marca} {a.densidad}</span><b>{a.litros} Lts</b>
                    </div>
                )) : <span style={{ color: 'var(--text-muted)' }}>No se registraron aceites.</span>}
            </div>

            <div className="card" style={{ width: '100%', borderLeft: '4px solid #a855f7' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#a855f7', marginBottom: '.6rem' }}><Filter size={18} /> Filtros utilizados</h3>
                {filtrosLista.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.6rem' }}>
                        {filtrosLista.map(([label, val]) => (
                            <div key={label} style={{ padding: '.5rem .7rem', borderRadius: 6, border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Filtro de {label}</div>
                                <div style={{ fontWeight: 600 }}>{val}</div>
                            </div>
                        ))}
                    </div>
                ) : <span style={{ color: 'var(--text-muted)' }}>No se registraron filtros.</span>}
            </div>

            <div className="card" style={{ width: '100%', borderLeft: '4px solid #f59e0b' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#f59e0b', marginBottom: '.6rem' }}><Wrench size={18} /> Servicios y complementos</h3>
                <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '.3rem' }}>Servicios realizados</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.8rem' }}>
                    {servicios.length ? servicios.map((s, i) => <span key={i} className="badge">{s}</span>) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </div>
                <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '.3rem' }}>Complementos</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                    {complementos.length ? complementos.map((s, i) => <span key={i} className="badge">{s}</span>) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </div>
                {info.complementos_adicionales && <p style={{ marginTop: '.8rem', fontStyle: 'italic' }}>{info.complementos_adicionales}</p>}
            </div>

            {cli && (
                <div className="card no-print" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#f59e0b', margin: 0 }}><Award size={18} /> Puntos del cliente</h3>
                        <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '.2rem 0 0' }}>
                            Acumulados: <strong style={{ color: 'white' }}>{puntos.toLocaleString('es-AR')} pts</strong> · Mínimo para canjear: <strong>{min} pts</strong>
                        </p>
                    </div>
                    {can(ses.rol, 'puntos.canje') && info.estado !== 'en_proceso' && info.estado !== 'en_espera' && (
                        <Link href={`/ordenes/${id}/canje`} className="btn-primary"><Award size={16} /> Canjear puntos</Link>
                    )}
                </div>
            )}

            <PrintSummaryButton />

            <style dangerouslySetInnerHTML={{ __html: `@media print { .navbar, .no-print { display: none !important; } body { background: #fff; color: #000; } .card { border: 1px solid #ccc !important; background: none !important; break-inside: avoid; } * { color: #000 !important; } }` }} />
        </main>
    );
}
