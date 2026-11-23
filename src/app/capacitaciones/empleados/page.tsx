import { requireSesion } from '@/lib/auth';
import { getEmpleados, getDepartamentos, createEmpleado } from '@/lib/actions';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EmpleadosPage() {
    await requireSesion('capacitaciones');
    const empleados = await getEmpleados();
    const departamentos = await getDepartamentos();

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <Link href="/capacitaciones" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Volver a Capacitaciones
                </Link>
                <h1 className="page-title">Personal y Operarios</h1>
                <p className="app-subtitle">Gestión de empleados y técnicos de Nozieres.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', width: '100%' }}>
                {/* Alta de Empleado */}
                <div className="hero-glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserPlus size={20} color="var(--accent)" /> Registrar Nuevo
                    </h3>
                    <form action={createEmpleado}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Nombre Completo</label>
                                <input name="nombre" type="text" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">Email</label>
                                <input name="email" type="email" className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">Departamento</label>
                                <select name="departamento_id" className="form-input" required>
                                    <option value="">Seleccionar...</option>
                                    {departamentos.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Perfil / Cargo</label>
                                <input name="perfil" type="text" className="form-input" placeholder="Ej: Mecánico Senior" />
                            </div>
                            <button type="submit" style={{ marginTop: '1rem', padding: '0.8rem', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>
                                Guardar Empleado
                            </button>
                        </div>
                    </form>
                </div>

                {/* Listado de Empleados */}
                <div className="hero-glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="var(--accent)" /> Lista de Personal
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.8rem' }}>Nombre</th>
                                    <th style={{ textAlign: 'left', padding: '0.8rem' }}>Departamento</th>
                                    <th style={{ textAlign: 'left', padding: '0.8rem' }}>Cargo</th>
                                    <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empleados.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay empleados registrados.</td>
                                    </tr>
                                ) : (
                                    empleados.map(emp => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.8rem', fontWeight: 500 }}>{emp.nombre}</td>
                                            <td style={{ padding: '0.8rem' }}>{emp.departamento_nombre}</td>
                                            <td style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>{emp.perfil}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <span style={{ padding: '2px 8px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '10px', fontSize: '0.75rem' }}>Activo</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
