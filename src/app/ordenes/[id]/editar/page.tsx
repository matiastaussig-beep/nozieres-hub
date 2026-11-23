import { getOrdenById, getVehiculos } from '@/lib/actions';
import { editarOrdenAction } from '@/lib/taller-actions';
import { tecnicosActivos } from '@/lib/queries';
import { requireSesion, puedeVerSucursal } from '@/lib/auth';
import OrdenForm from '@/components/OrdenForm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditarOrdenPage({ params }: { params: Promise<{ id: string }> }) {
    const ses = await requireSesion('ordenes.editar');
    const ordenId = parseInt((await params).id);
    if (isNaN(ordenId)) notFound();
    const [orden, vehiculos] = await Promise.all([getOrdenById(ordenId), getVehiculos()]);
    if (!orden || !puedeVerSucursal(ses, orden.sucursal_id)) notFound();
    const onSubmit = editarOrdenAction.bind(null, ordenId);
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Editar orden #{String(ordenId).padStart(4, '0')}</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Queda registrado quién la modificó y por qué.</p>
                </div>
            </div>
            <div className="hero-glass" style={{ maxWidth: 900, width: '100%', textAlign: 'left', padding: '2rem' }}>
                <OrdenForm vehiculos={vehiculos} onSubmit={onSubmit} initialData={orden as any} sucursalId={orden.sucursal_id} tecnicos={tecnicosActivos()} />
            </div>
        </main>
    );
}
