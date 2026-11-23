import { getVehiculos } from '@/lib/actions';
import { abrirOrdenAction } from '@/lib/taller-actions';
import { tecnicosActivos } from '@/lib/queries';
import { requireSesion } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OrdenForm from '@/components/OrdenForm';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NuevaOrden({ searchParams }: { searchParams: Promise<{ turno?: string; vehiculo?: string }> }) {
    const ses = await requireSesion('ordenes.abrir');
    const sp = await searchParams;
    const vehiculos = await getVehiculos();
    const turno = sp.turno ? db.prepare('SELECT id, vehiculo_id, tecnico, presupuesto_nro, motivo, sucursal_id FROM turnos WHERE id = ?').get(Number(sp.turno)) as any : null;
    const sucursalId = turno?.sucursal_id ?? ses.sucursalActivaId;
    const sinSucursal = !sucursalId;

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Nueva orden de trabajo</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Al guardarla queda <b>en proceso</b> y se avisa al cliente que recibimos su vehículo.</p>
                </div>
                <Link href="/ordenes" className="btn-primary" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white' }}><ArrowLeft size={18} /> Volver</Link>
            </div>
            {sinSucursal ? (
                <div className="hero-glass" style={{ maxWidth: 640 }}>
                    <p>Estás viendo <b>todas las sucursales</b>. Elegí una sucursal en el selector de arriba para abrir una orden.</p>
                </div>
            ) : (
                <div className="hero-glass" style={{ maxWidth: '900px', margin: '0 auto', width: '100%', textAlign: 'left', padding: '2rem' }}>
                    <OrdenForm vehiculos={vehiculos} onSubmit={abrirOrdenAction} sucursalId={sucursalId} tecnicos={tecnicosActivos()} turno={turno} />
                </div>
            )}
        </main>
    );
}
