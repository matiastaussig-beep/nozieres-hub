import { requireSesion } from '@/lib/auth';
import { getVehiculoByPatente, getHistorialVehiculo } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { ArrowLeft, Car, User, Phone, Mail, Clock, FileText, Wrench } from 'lucide-react';
import Link from 'next/link';
import db from '@/lib/db';
import { getSesion, can } from '@/lib/auth';
import { getClientes } from '@/lib/actions';
import { transferirVehiculoAction } from '@/lib/vehiculo-actions';
import SearchableSelect from '@/components/SearchableSelect';
import { fechaCorta } from '@/lib/tiempo';
import { tokenCertificado, baseUrl } from '@/lib/mensajes';

function calcDuration(ingreso: string | null, fin: string | null): string | null {
    if (!ingreso || !fin) return null;
    try {
        const [h1, m1] = ingreso.split(':').map(Number);
        const [h2, m2] = fin.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        return diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff} min`;
    } catch { return null; }
}

export default async function HistorialVehiculoPage({ params, searchParams }: { params: Promise<{ patente: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
    await requireSesion('vehiculos.ver');
    const { patente } = await params;
    const sp = await searchParams;
    const ses = await getSesion();
    const decodedPatente = decodeURIComponent(patente).toUpperCase();
    const vehiculo = await getVehiculoByPatente(decodedPatente);

    if (!vehiculo) return notFound();

    const historial = await getHistorialVehiculo(vehiculo.id);
    const titulares = db.prepare(`SELECT p.*, c.nombre, c.id cid FROM vehiculo_propietarios p JOIN clientes c ON c.id = p.cliente_id WHERE p.vehiculo_id = ? ORDER BY p.desde DESC, p.id DESC`).all(vehiculo.id) as any[];
    const puedeTransferir = can(ses?.rol, 'vehiculos.editar');
    const clientes = puedeTransferir ? await getClientes() : [];
    const certToken = tokenCertificado(vehiculo.id);

    const totalServicios = historial.length;
    const ultimaPatente = historial[0];

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            {/* Header */}
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Historial: {decodedPatente}</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>
                        {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio ? `(${vehiculo.anio})` : ''}
                    </p>
                </div>
                <Link href="/vehiculos" className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}>
                    <ArrowLeft size={18} /> Volver
                </Link>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%', marginBottom: '2rem' }}>
                {/* Vehículo */}
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(255,215,0,0.1)', padding: '0.8rem', borderRadius: '50%', color: 'var(--accent)' }}>
                        <Car size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Tipo de Vehículo</p>
                        <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{vehiculo.tipo_vehiculo || 'Auto'}</p>
                    </div>
                    <form action={async (formData) => {
                        'use server';
                        const nuevoTipo = formData.get('tipo_vehiculo') as string;
                        const { updateVehiculoTipoAction } = await import('@/lib/actions');
                        const lastOrdenId = await updateVehiculoTipoAction(vehiculo.id, nuevoTipo);
                        if (lastOrdenId) {
                            const { redirect } = await import('next/navigation');
                            redirect(`/ordenes/${lastOrdenId}/editar`);
                        }
                    }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select name="tipo_vehiculo" defaultValue={vehiculo.tipo_vehiculo || 'Auto'} className="form-input" style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
                            <option value="Auto">Auto</option>
                            <option value="Camioneta">Camioneta</option>
                            <option value="Camión">Camión</option>
                        </select>
                        <button type="submit" className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>Cambiar</button>
                    </form>
                </div>
                {/* Cliente */}
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '50%' }}>
                        <User size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Propietario</p>
                        <p style={{ fontWeight: 600 }}>{vehiculo.cliente_nombre}</p>
                        {(vehiculo as any).cliente_dni && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DNI: {(vehiculo as any).cliente_dni}</p>}
                    </div>
                </div>
                {/* Teléfono */}
                {(vehiculo as any).cliente_telefono && (
                    <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(37,211,102,0.1)', padding: '0.8rem', borderRadius: '50%', color: '#25D366' }}>
                            <Phone size={24} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Teléfono</p>
                            <p style={{ fontWeight: 600 }}>{(vehiculo as any).cliente_telefono}</p>
                        </div>
                    </div>
                )}
                {/* Stats */}
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,215,0,0.1)', padding: '0.8rem', borderRadius: '50%', color: 'var(--accent)' }}>
                        <Wrench size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Total Servicios</p>
                        <p style={{ fontWeight: 600 }}>{totalServicios} {totalServicios === 1 ? 'visita' : 'visitas'}</p>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div style={{ width: '100%' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="var(--accent)" /> Línea de Tiempo de Servicios
                </h2>

                {historial.length === 0 ? (
                    <div className="hero-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Este vehículo no tiene órdenes de trabajo registradas aún.
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                        {/* Línea vertical */}
                        <div style={{ position: 'absolute', left: '0.6rem', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(to bottom, var(--accent), transparent)' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {historial.map((orden, index) => {
                                let aceiteMotor = '-';
                                if (orden.aceite_utilizado) {
                                    try {
                                        const oil = JSON.parse(orden.aceite_utilizado);
                                        aceiteMotor = `${oil.motor?.marca || ''} ${oil.motor?.densidad || ''}`.trim() || '-';
                                    } catch { aceiteMotor = orden.aceite_utilizado; }
                                }

                                let serviciosLista: string[] = [];
                                try {
                                    const sa = orden.servicios_autos ? JSON.parse(orden.servicios_autos) : [];
                                    const sc = orden.servicios_camioneta ? JSON.parse(orden.servicios_camioneta) : [];
                                    const sk = orden.servicios_camion ? JSON.parse(orden.servicios_camion) : [];
                                    serviciosLista = [...sa, ...sc, ...sk].filter(Boolean);
                                } catch { }

                                const duration = calcDuration(orden.hora_ingreso, orden.hora_fin_real);
                                const isFirst = index === 0;

                                return (
                                    <div key={orden.id} style={{ position: 'relative' }}>
                                        {/* Dot */}
                                        <div style={{
                                            position: 'absolute', left: '-1.65rem', top: '1.2rem',
                                            width: '14px', height: '14px', borderRadius: '50%',
                                            background: isFirst ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                                            border: `2px solid ${isFirst ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                                            boxShadow: isFirst ? '0 0 10px rgba(255,215,0,0.5)' : 'none'
                                        }} />

                                        <div className="hero-glass" style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                        #{orden.id.toString().padStart(4, '0')}
                                                    </span>
                                                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                                        {new Date(orden.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </span>
                                                    {isFirst && (
                                                        <span style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--accent)', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.3)' }}>
                                                            Último
                                                        </span>
                                                    )}
                                                </div>
                                                <Link href={`/ordenes/${orden.id}/imprimir`} className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}>
                                                    <FileText size={13} /> Ver Ficha
                                                </Link>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem', fontSize: '0.85rem' }}>
                                                <div>
                                                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Kilometraje</p>
                                                    <p style={{ fontWeight: 500 }}>{orden.kilometraje ? `${orden.kilometraje.toLocaleString()} km` : '-'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Aceite Motor</p>
                                                    <p style={{ fontWeight: 500, color: 'var(--accent)' }}>{aceiteMotor}</p>
                                                </div>
                                                <div>
                                                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Mecánico</p>
                                                    <p style={{ fontWeight: 500 }}>{orden.mecanico || '-'}</p>
                                                </div>
                                                {duration && (
                                                    <div>
                                                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Duración</p>
                                                        <p style={{ fontWeight: 500, color: '#4ade80' }}>{duration}</p>
                                                    </div>
                                                )}
                                                {orden.proximo_servicio_km && (
                                                    <div>
                                                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Próximo Service</p>
                                                        <p style={{ fontWeight: 500, color: '#f97316' }}>{orden.proximo_servicio_km.toLocaleString()} km</p>
                                                    </div>
                                                )}
                                            </div>

                                            {serviciosLista.length > 0 && (
                                                <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--glass-border)' }}>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Servicios realizados:</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                                        {serviciosLista.map((srv, i) => (
                                                            <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {srv}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {sp.ok === 'transfer' && <p style={{ color: '#4ade80' }}>✓ Traspaso registrado. El historial quedó con el dominio y ahora lo ve el nuevo titular.</p>}
            {sp.error && <p style={{ color: '#f87171' }}>⚠️ {sp.error === 'mismo' ? 'Ya es el titular actual.' : 'Indicá el nombre del nuevo titular.'}</p>}
            <div className="hero-glass" style={{ width: '100%', padding: '1.2rem', marginTop: '1rem', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '.6rem' }}>Titulares del dominio</h3>
                {titulares.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', padding: '.4rem 0', fontSize: '.9rem' }}>
                        <span><Link href={`/clientes/${t.cid}`} style={{ color: 'var(--accent)' }}>{t.nombre}</Link>{!t.hasta && <b style={{ marginLeft: 6, color: '#4ade80' }}>actual</b>}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{fechaCorta(t.desde)} → {t.hasta ? fechaCorta(t.hasta) : 'hoy'}</span>
                    </div>
                ))}
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.6rem' }}>Certificado público del historial (sin datos del titular): {baseUrl() ? <a href={`${baseUrl()}/v/${certToken}`} style={{ color: 'var(--accent)' }}>{`${baseUrl()}/v/${certToken}`}</a> : <Link href={`/v/${certToken}`} style={{ color: 'var(--accent)' }}>ver certificado</Link>}</p>
                {puedeTransferir && (
                    <details style={{ marginTop: '.8rem' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--accent)' }}>Vendieron el vehículo · transferir a un nuevo titular</summary>
                        <form action={transferirVehiculoAction.bind(null, vehiculo.id)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.8rem', marginTop: '.8rem', alignItems: 'end' }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}><label>Cliente que ya existe (opcional)</label>
                                <SearchableSelect name="cliente_existente" options={clientes.map(c => ({ value: String(c.id), label: `${c.nombre}${c.dni ? ' · ' + c.dni : ''}` }))} placeholder="Buscar cliente…" /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label>…o nuevo: nombre</label><input className="form-input" name="nombre" /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label>DNI</label><input className="form-input" name="dni" /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label>Teléfono</label><input className="form-input" name="telefono" /></div>
                            <button className="btn-primary" type="submit">Registrar traspaso</button>
                        </form>
                    </details>
                )}
            </div>
        </main>
    );
}
