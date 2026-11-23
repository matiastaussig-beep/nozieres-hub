import { requireSesion } from '@/lib/auth';
import { getCapacitaciones, getDepartamentos, getEmpleados } from '@/lib/actions';
import { Calendar, Plus, Users, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import Timeline from '../../components/Timeline';

export const dynamic = 'force-dynamic';

export default async function CapacitacionesPage() {
    await requireSesion('capacitaciones');
    const capacitaciones = await getCapacitaciones();
    const departamentos = await getDepartamentos();
    const empleados = await getEmpleados();

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Capacitaciones y Entrenamiento</h1>
                    <p className="app-subtitle">Gestión de formación continua para el equipo de Nozieres.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/capacitaciones/empleados" className="hero-glass" style={{ padding: '0.8rem 1.2rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Users size={18} /> Gestionar Empleados
                    </Link>
                    <Link href="/capacitaciones/nueva" style={{ padding: '0.8rem 1.5rem', background: 'var(--accent)', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={20} /> Nueva Capacitación
                    </Link>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="hero-glass" style={{ width: '100%', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Calendar size={20} color="var(--accent)" /> Cronograma Mensual
                </h3>
                <Timeline capacitaciones={capacitaciones} />
            </div>

            {/* List Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', width: '100%' }}>
                <div className="hero-glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Próximas Sesiones</h3>
                    {capacitaciones.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No hay capacitaciones programadas.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {capacitaciones.map(cap => (
                                <div key={cap.id} style={{ padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, color: cap.es_obligatoria ? 'var(--accent)' : 'white' }}>
                                            {cap.titulo} {cap.es_obligatoria ? '(Obligatoria)' : ''}
                                        </h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                                            {new Date(cap.fecha).toLocaleDateString()} - {cap.departamento_nombre || 'Global'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="hero-glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Resumen de Equipo</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Total Empleados:</span>
                            <span style={{ fontWeight: 'bold' }}>{empleados.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Departamentos:</span>
                            <span style={{ fontWeight: 'bold' }}>{departamentos.length}</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.5rem 0' }} />
                        <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 215, 0, 0.1)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <GraduationCap size={16} /> Tip de Formación
                            </p>
                            <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
                                Las capacitaciones obligatorias se asignan automáticamente a todos los miembros del departamento seleccionado.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
