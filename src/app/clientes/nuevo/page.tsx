import { requireSesion } from '@/lib/auth';
import { createCliente } from '@/lib/actions';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NuevoCliente() {
    await requireSesion('clientes.editar');
    async function onSubmit(formData: FormData) {
        'use server';
        await createCliente(formData);
        redirect('/clientes');
    }

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Nuevo Cliente</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Registra un nuevo cliente en el sistema.</p>
                </div>
                <Link href="/clientes" className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <ArrowLeft size={18} /> Volver
                </Link>
            </div>

            <div className="hero-glass" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', textAlign: 'left', padding: '2rem' }}>
                <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label htmlFor="nombre" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Nombre Completo *</label>
                        <input type="text" id="nombre" name="nombre" className="form-input" required placeholder="Ej: Juan Pérez" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dni" style={{ color: 'var(--text-main)', fontWeight: 500 }}>DNI</label>
                        <input type="text" id="dni" name="dni" className="form-input" placeholder="Ej: 12345678" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="telefono" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" className="form-input" placeholder="Ej: 011 1234-5678" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Correo Electrónico</label>
                        <input type="email" id="email" name="email" className="form-input" placeholder="Ej: juan@example.com" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary">
                            <Save size={18} /> Guardar Cliente
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
