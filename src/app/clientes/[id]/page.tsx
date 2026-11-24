import { requireSesion } from '@/lib/auth';
import { getClienteById, getVehiculosDeCliente, getHistorialCliente, actualizarAvisosClienteAction } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, CreditCard, Car, Wrench, Clock, FileText, MessageCircle, AlertTriangle, CheckCircle, Calendar, Award, MapPin } from 'lucide-react';
import Link from 'next/link';

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

interface VehiculoConPrediccion {
    id: number;
    patente: string;
    marca: string | null;
    modelo: string | null;
    anio: number | null;
    tipo_vehiculo: string;
    ultimo_servicio_fecha?: string;
    ultimo_servicio_km?: number;
    proximo_servicio_km?: number;
    proximo_servicio_fecha?: string;
    penultimo_km?: number;
    penultima_fecha?: string;
    // computed
    prediccion?: {
        fechaEstimada: Date;
        diasRestantes: number;
        urgencia: 'ok' | 'proximo' | 'vencido';
        kmPorDia: number;
    } | null;
}

function calcPrediccion(v: any): VehiculoConPrediccion['prediccion'] {
    const proximoKm = v.proximo_servicio_km;
    const ultimoKm = v.ultimo_servicio_km;
    const ultimaFecha = v.ultimo_servicio_fecha;
    const penultimoKm = v.penultimo_km;
    const penultimaFecha = v.penultima_fecha;

    if (!proximoKm || !ultimoKm || !ultimaFecha) return null;

    let kmPorDia: number | null = null;

    // Si tenemos dos puntos de datos, calculamos velocidad real
    if (penultimoKm && penultimaFecha && ultimoKm > penultimoKm) {
        const dias = (new Date(ultimaFecha).getTime() - new Date(penultimaFecha).getTime()) / (1000 * 60 * 60 * 24);
        if (dias > 0) {
            kmPorDia = (ultimoKm - penultimoKm) / dias;
        }
    }

    // Si no hay dos puntos, usamos 30 km/día como estimación conservadora
    if (!kmPorDia || kmPorDia <= 0) kmPorDia = 30;

    const kmFaltantes = proximoKm - ultimoKm;
    if (kmFaltantes <= 0) {
        // Ya superó el km de próximo service
        return { fechaEstimada: new Date(ultimaFecha), diasRestantes: 0, urgencia: 'vencido', kmPorDia };
    }

    const diasRestantes = Math.round(kmFaltantes / kmPorDia);
    const fechaEstimada = new Date();
    fechaEstimada.setDate(fechaEstimada.getDate() + diasRestantes);

    const urgencia: 'ok' | 'proximo' | 'vencido' =
        diasRestantes <= 0 ? 'vencido' :
        diasRestantes <= 30 ? 'proximo' : 'ok';

    return { fechaEstimada, diasRestantes, urgencia, kmPorDia: Math.round(kmPorDia) };
}

export default async function ClientePerfilPage({ params }: { params: Promise<{ id: string }> }) {
    await requireSesion('clientes.ver');
    const { id } = await params;
    const clienteId = parseInt(id);
    if (isNaN(clienteId)) return notFound();

    const cliente = await getClienteById(clienteId);
    if (!cliente) return notFound();

    const vehiculosRaw = await getVehiculosDeCliente(clienteId);
    const historial = await getHistorialCliente(clienteId);

    const vehiculos: VehiculoConPrediccion[] = vehiculosRaw.map(v => ({
        ...v,
        prediccion: calcPrediccion(v)
    }));

    const totalServicios = historial.length;
    const alertas = vehiculos.filter(v => v.prediccion && v.prediccion.urgencia !== 'ok');

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>

            {/* Header */}
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Perfil: {cliente.nombre}</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>
                        Expediente completo del cliente en Nozieres Lubricantes.
                    </p>
                </div>
                <Link href="/clientes" className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}>
                    <ArrowLeft size={18} /> Volver
                </Link>
            </div>

            {/* Alertas de service próximo */}
            {alertas.length > 0 && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {alertas.map(v => {
                        const pred = v.prediccion!;
                        const isVencido = pred.urgencia === 'vencido';
                        const color = isVencido ? '#ef4444' : '#f97316';
                        const bg = isVencido ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)';
                        const border = isVencido ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.25)';
                        const waMsg = encodeURIComponent(
                            `Hola ${cliente.nombre}! 👋 Te contactamos desde Nozieres Lubricantes.\n\n` +
                            `Tu vehículo *${v.patente.toUpperCase()}* (${v.marca} ${v.modelo}) ` +
                            (isVencido
                                ? `ha *superado* el kilometraje recomendado para su próximo service (${v.proximo_servicio_km?.toLocaleString()} km). ¡Te recomendamos traerlo a revision cuanto antes!`
                                : `tiene su próximo service estimado para el *${pred.fechaEstimada.toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}* (en ${pred.diasRestantes} días aprox.).`) +
                            `\n\n¡Te esperamos en el taller! 🔧`
                        );
                        const waPhone = cliente.telefono?.replace(/[^0-9]/g, '') || '';
                        return (
                            <div key={v.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <AlertTriangle size={20} color={color} />
                                    <div>
                                        <p style={{ fontWeight: 600, color, marginBottom: '0.1rem' }}>
                                            {isVencido ? '⚠️ Service VENCIDO' : '🔔 Service Próximo'} — {v.patente.toUpperCase()}
                                        </p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {isVencido
                                                ? `Ya superó los ${v.proximo_servicio_km?.toLocaleString()} km recomendados`
                                                : `Estimado: ${pred.fechaEstimada.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })} (en ${pred.diasRestantes} días) · ${pred.kmPorDia} km/día promedio`
                                            }
                                        </p>
                                    </div>
                                </div>
                                {waPhone && (
                                    <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 'var(--radius-md)', color: '#25D366', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                        <MessageCircle size={16} /> Avisar por WhatsApp
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <form action={actualizarAvisosClienteAction.bind(null, cliente.id)} className="hero-glass" style={{ padding: '1rem 1.2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.2rem', width: '100%', marginBottom: '1rem' }}>
                <b style={{ fontSize: '.9rem' }}>Avisos al cliente</b>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><input type="checkbox" name="avisos_whatsapp" defaultChecked={cliente.avisos_whatsapp !== 0} /> WhatsApp</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><input type="checkbox" name="avisos_email" defaultChecked={cliente.avisos_email !== 0} /> Mail</label>
                <button className="btn-primary" style={{ padding: '.3rem .9rem', fontSize: '.85rem' }}>Guardar</button>
            </form>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', width: '100%', marginBottom: '2rem' }}>
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,215,0,0.1)', padding: '0.8rem', borderRadius: '50%', color: 'var(--accent)', flexShrink: 0 }}><User size={22} /></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>DNI</p>
                        <p style={{ fontWeight: 600 }}>{cliente.dni || 'No registrado'}</p>
                    </div>
                </div>
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255, 215, 0, 0.3)', background: 'rgba(255, 215, 0, 0.03)' }}>
                    <div style={{ background: 'rgba(255,215,0,0.15)', padding: '0.8rem', borderRadius: '50%', color: '#f59e0b', flexShrink: 0 }}><Award size={22} /></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Programa Fidelización</p>
                        <p style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{cliente.puntos_acumulados || 0} pts acumulados</p>
                    </div>
                </div>
                {cliente.telefono && (
                    <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(37,211,102,0.1)', padding: '0.8rem', borderRadius: '50%', color: '#25D366', flexShrink: 0 }}><Phone size={22} /></div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Teléfono</p>
                            <a href={`https://wa.me/${cliente.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#25D366', textDecoration: 'none' }}>{cliente.telefono}</a>
                        </div>
                    </div>
                )}
                {cliente.email && (
                    <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '50%', flexShrink: 0 }}><Mail size={22} /></div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Email</p>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cliente.email}</p>
                        </div>
                    </div>
                )}
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '50%', flexShrink: 0 }}><Car size={22} /></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Vehículos</p>
                        <p style={{ fontWeight: 600 }}>{vehiculos.length}</p>
                    </div>
                </div>
                <div className="hero-glass" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,215,0,0.1)', padding: '0.8rem', borderRadius: '50%', color: 'var(--accent)', flexShrink: 0 }}><Wrench size={22} /></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Total Servicios</p>
                        <p style={{ fontWeight: 600 }}>{totalServicios}</p>
                    </div>
                </div>
            </div>


            {/* Vehículos del cliente */}
            <div style={{ width: '100%', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Car size={18} color="var(--accent)" /> Vehículos Registrados
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {vehiculos.map(v => {
                        const pred = v.prediccion;
                        const urgColor = pred?.urgencia === 'vencido' ? '#ef4444' : pred?.urgencia === 'proximo' ? '#f97316' : '#4ade80';
                        return (
                            <div key={v.id} className="hero-glass" style={{ padding: '1.2rem', position: 'relative', overflow: 'hidden' }}>
                                {pred && (
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: urgColor, opacity: 0.7 }} />
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                    <div>
                                        <Link href={`/vehiculos/${v.patente}`} style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)', textDecoration: 'none' }}>
                                            {v.patente.toUpperCase()}
                                        </Link>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ''}</p>
                                    </div>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {v.tipo_vehiculo}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Último service</p>
                                        <p style={{ fontWeight: 500 }}>{v.ultimo_servicio_fecha ? new Date(v.ultimo_servicio_fecha).toLocaleDateString('es-AR') : '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.1rem' }}>KM</p>
                                        <p style={{ fontWeight: 500 }}>{v.ultimo_servicio_km ? `${(v.ultimo_servicio_km as number).toLocaleString()}` : '-'}</p>
                                    </div>
                                    {(v as any).proximo_servicio_km && (
                                        <div>
                                            <p style={{ color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Próximo KM</p>
                                            <p style={{ fontWeight: 500, color: 'var(--accent)' }}>{((v as any).proximo_servicio_km as number).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                                {pred && (
                                    <div style={{ background: `rgba(${pred.urgencia === 'vencido' ? '239,68,68' : pred.urgencia === 'proximo' ? '249,115,22' : '74,222,128'},0.08)`, border: `1px solid ${urgColor}30`, borderRadius: 'var(--radius-md)', padding: '0.5rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {pred.urgencia === 'ok' ? <CheckCircle size={14} color={urgColor} /> : <AlertTriangle size={14} color={urgColor} />}
                                        <span style={{ color: urgColor, fontWeight: 500 }}>
                                            {pred.urgencia === 'vencido' ? 'Service vencido' :
                                             pred.urgencia === 'proximo' ? `Service en ${pred.diasRestantes} días (~${pred.fechaEstimada.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })})` :
                                             `Próximo estimado: ${pred.fechaEstimada.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                        </span>
                                    </div>
                                )}
                                <Link href={`/vehiculos/${v.patente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
                                    <FileText size={13} /> Ver historial completo →
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Timeline unificada */}
            <div style={{ width: '100%' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="var(--accent)" /> Línea de Tiempo Unificada
                </h2>
                {historial.length === 0 ? (
                    <div className="hero-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Este cliente no tiene órdenes de trabajo registradas aún.
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                        <div style={{ position: 'absolute', left: '0.6rem', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(to bottom, var(--accent), transparent)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {historial.map((orden, index) => {
                                let aceiteMotor = '-';
                                if (orden.aceite_utilizado) {
                                    try { const oil = JSON.parse(orden.aceite_utilizado); aceiteMotor = `${oil.motor?.marca || ''} ${oil.motor?.densidad || ''}`.trim() || '-'; } catch { }
                                }
                                const duration = calcDuration(orden.hora_ingreso, orden.hora_fin_real);
                                return (
                                    <div key={orden.id} style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '-1.65rem', top: '1rem', width: '12px', height: '12px', borderRadius: '50%', background: index === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.15)', border: `2px solid ${index === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, boxShadow: index === 0 ? '0 0 8px rgba(255,215,0,0.4)' : 'none' }} />
                                        <div className="hero-glass" style={{ padding: '1rem 1.2rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{orden.id.toString().padStart(4, '0')}</span>
                                                    <span style={{ fontWeight: 600 }}>{new Date(orden.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                                    <span style={{ background: 'rgba(255,215,0,0.1)', color: 'var(--accent)', fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.2)' }}>
                                                        {(orden as any).vehiculo_patente?.toUpperCase()} · {(orden as any).vehiculo_marca}
                                                    </span>
                                                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '0.75rem', padding: '0.1rem 0.6rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                        <MapPin size={12} /> {orden.sucursal_nombre || 'Central (Ledesma)'}
                                                    </span>
                                                </div>
                                                <Link href={`/ordenes/${orden.id}/imprimir`} className="btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}>
                                                    <FileText size={12} /> Ficha
                                                </Link>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                                                <div><span style={{ color: 'var(--text-muted)' }}>KM: </span><span style={{ fontWeight: 500 }}>{orden.kilometraje?.toLocaleString() || '-'}</span></div>
                                                <div><span style={{ color: 'var(--text-muted)' }}>Aceite: </span><span style={{ fontWeight: 500, color: 'var(--accent)' }}>{aceiteMotor}</span></div>
                                                <div><span style={{ color: 'var(--text-muted)' }}>Mecánico: </span><span style={{ fontWeight: 500 }}>{orden.mecanico || '-'}</span></div>
                                                {duration && <div><span style={{ color: 'var(--text-muted)' }}>Duración: </span><span style={{ fontWeight: 500, color: '#4ade80' }}>{duration}</span></div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
