import { requireSesion } from '@/lib/auth';
import { createCapacitacion, getDepartamentos } from '@/lib/actions';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NuevaCapacitacionPage() {
    await requireSesion('capacitaciones');
    const departamentos = await getDepartamentos();

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <Link href="/capacitaciones" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Volver a Capacitaciones
                </Link>
                <h1 className="page-title">Nueva Capacitación</h1>
                <p className="app-subtitle">Programar una nueva sesión de formación para el personal.</p>
            </div>

            <div className="hero-glass" style={{ width: '100%', maxWidth: '800px', padding: '2rem' }}>
                <form action={createCapacitacion}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Título de la Capacitación</label>
                            <input name="titulo" type="text" className="form-input" required placeholder="Ej: Seguridad e Higiene en el Taller" />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Descripción / Objetivos</label>
                            <textarea name="descripcion" className="form-input" rows={3} placeholder="Detalles de la formación..."></textarea>
                        </div>

                        <div>
                            <label className="form-label">Fecha y Hora</label>
                            <input name="fecha" type="datetime-local" className="form-input" required />
                        </div>

                        <div>
                            <label className="form-label">Departamento Destinatario (Opcional)</label>
                            <select name="departamento_id" className="form-input">
                                <option value="">Todos los departamentos</option>
                                {departamentos.map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <input type="checkbox" name="es_obligatoria" id="es_obligatoria" style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }} />
                            <label htmlFor="es_obligatoria" style={{ fontWeight: 'bold', cursor: 'pointer' }}>Es una capacitación OBLIGATORIA</label>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                Se asignará automáticamente a todos los empleados del departamento seleccionado.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '1rem 2rem', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>
                            <Save size={20} /> Guardar y Programar
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
