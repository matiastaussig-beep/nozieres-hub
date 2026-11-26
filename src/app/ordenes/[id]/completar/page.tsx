import { getOrdenById, getVehiculos } from '@/lib/actions';
import { completarOrdenAction } from '@/lib/taller-actions';
import { tecnicosActivos } from '@/lib/queries';
import { requireSesion, puedeVerSucursal } from '@/lib/auth';
import OrdenForm from '@/components/OrdenForm';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CompletarOrdenPage({ params }: { params: Promise<{ id: string }> }) {
    const ses = await requireSesion('ordenes.abrir');
    const ordenId = parseInt((await params).id);
    if (isNaN(ordenId)) notFound();
    const [orden, vehiculos] = await Promise.all([getOrdenById(ordenId), getVehiculos()]);
    if (!orden || !puedeVerSucursal(ses, orden.sucursal_id)) notFound();
    if (orden.estado !== 'en_proceso') redirect(`/ordenes/${ordenId}`);
    const onSubmit = completarOrdenAction.bind(null, ordenId);
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Completar orden #{String(ordenId).padStart(4, '0')}</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>La orden ya está abierta y el cliente ya fue avisado. Cargá servicios, aceites, filtros y las fotos del vehículo. Después se firma y se termina.</p>
                </div>
            </div>
            <div className="hero-glass" style={{ maxWidth: 900, width: '100%', textAlign: 'left', padding: '2rem' }}>
                <OrdenForm vehiculos={vehiculos} onSubmit={onSubmit} initialData={orden as any} sucursalId={orden.sucursal_id} tecnicos={tecnicosActivos()} completar />
            </div>
        </main>
    );
}
