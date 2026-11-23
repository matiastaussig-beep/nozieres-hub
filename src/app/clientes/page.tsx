import { requireSesion } from '@/lib/auth';
import { getClientes } from '@/lib/actions';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    await requireSesion('clientes.ver');
    const params = await searchParams;
    const query = params.q || '';
    const clientes = await getClientes(query);

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Directorio de Clientes</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Gestiona la información de clientes y sus vehículos registrados.</p>
                </div>
                <Link href="/clientes/nuevo" className="btn-primary">
                    <PlusCircle size={18} /> Nuevo Cliente
                </Link>
            </div>

            <div className="table-container">
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <SearchInput />
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>DNI</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>Fecha Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.length > 0 ? (
                            clientes.map(cliente => (
                                <tr key={cliente.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>#{cliente.id}</td>
                                    <td>
                                        <Link href={`/clientes/${cliente.id}`} style={{ fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>
                                            {cliente.nombre}
                                        </Link>
                                    </td>
                                    <td>{cliente.dni || '-'}</td>
                                    <td>{cliente.telefono || '-'}</td>
                                    <td>{cliente.email || '-'}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(cliente.fecha_registro).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <Link href={`/clientes/${cliente.id}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            Ver Perfil
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No hay clientes registrados en la base de datos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
