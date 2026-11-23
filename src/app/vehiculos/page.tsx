import { requireSesion } from '@/lib/auth';
import { getVehiculos } from '@/lib/actions';
import { PlusCircle, Car } from 'lucide-react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

export default async function VehiculosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    await requireSesion('vehiculos.ver');
    const params = await searchParams;
    const query = params.q || '';
    const vehiculos = await getVehiculos(query);

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Directorio de Vehículos</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Gestiona los vehículos y enlázalos a las OTs.</p>
                </div>
                <Link href="/vehiculos/nuevo" className="btn-primary">
                    <PlusCircle size={18} /> Nuevo Vehículo
                </Link>
            </div>

            <div className="table-container">
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <SearchInput />
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Patente</th>
                            <th>Marca y Modelo</th>
                            <th>Cliente</th>
                            <th>Último Service</th>
                            <th>KM</th>
                            <th>Aceite Motor</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehiculos.length > 0 ? (
                            vehiculos.map(v => {
                                let aceiteMotor = '-';
                                if (v.ultimo_servicio_aceite) {
                                    try {
                                        const oilData = JSON.parse(v.ultimo_servicio_aceite);
                                        if (oilData.motor) {
                                            aceiteMotor = `${oilData.motor.marca || ''} ${oilData.motor.densidad || ''}`.trim() || '-';
                                        } else {
                                            aceiteMotor = v.ultimo_servicio_aceite;
                                        }
                                    } catch (e) {
                                        aceiteMotor = v.ultimo_servicio_aceite;
                                    }
                                }

                                return (
                                    <tr key={v.id}>
                                        <td>
                                            <Link href={`/vehiculos/${v.patente}`} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                                                {v.patente.toUpperCase()}
                                            </Link>
                                        </td>
                                        <td>{v.marca || '-'} {v.modelo || ''}</td>
                                        <td style={{ fontWeight: 500 }}>{v.cliente_nombre}</td>
                                        <td>{v.ultimo_servicio_fecha ? new Date(v.ultimo_servicio_fecha).toLocaleDateString() : '-'}</td>
                                        <td>{v.ultimo_servicio_km ? `${v.ultimo_servicio_km.toLocaleString()} km` : '-'}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{aceiteMotor}</td>
                                        <td>
                                            <Link href={`/vehiculos/${v.patente}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Car size={14} /> Ver Historial
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No hay vehículos registrados en la base de datos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
