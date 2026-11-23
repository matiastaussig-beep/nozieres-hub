import { requireSesion } from '@/lib/auth';
import { createVehiculo, getClientes } from '@/lib/actions';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NuevoVehiculo() {
    await requireSesion('vehiculos.editar');
    const clientes = await getClientes();

    async function onSubmit(formData: FormData) {
        'use server';
        await createVehiculo(formData);
        redirect('/vehiculos');
    }

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Nuevo Vehículo</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Registra un vehículo y asígnalo a un cliente existente.</p>
                </div>
                <Link href="/vehiculos" className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}>
                    <ArrowLeft size={18} /> Volver
                </Link>
            </div>

            <div className="hero-glass" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', textAlign: 'left', padding: '2rem' }}>
                <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div className="form-group">
                        <label htmlFor="cliente_id" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Cliente Propietario *</label>
                        <select id="cliente_id" name="cliente_id" className="form-input" required>
                            <option value="">Seleccione un cliente...</option>
                            {clientes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="patente" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Patente / Matrícula *</label>
                            <input type="text" id="patente" name="patente" className="form-input" required placeholder="Ej: AA123BB / AB123CD" style={{ textTransform: 'uppercase' }} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="tipo_vehiculo" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Tipo de Vehículo *</label>
                            <select id="tipo_vehiculo" name="tipo_vehiculo" className="form-input" required>
                                <option value="Auto">Auto</option>
                                <option value="Camioneta">Camioneta</option>
                                <option value="Camion">Camión</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="marca" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Marca</label>
                            <input type="text" id="marca" name="marca" className="form-input" placeholder="Ej: Ford" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label htmlFor="modelo" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Modelo</label>
                            <input type="text" id="modelo" name="modelo" className="form-input" placeholder="Ej: Fiesta" />
                        </div>
                        <div className="form-group" style={{ width: '100px' }}>
                            <label htmlFor="anio" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Año</label>
                            <input type="number" id="anio" name="anio" className="form-input" placeholder="2018" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary">
                            <Save size={18} /> Guardar Vehículo
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
