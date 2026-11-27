import { requireSesion } from '@/lib/auth';
import ImportarBase from '@/components/ImportarBase';

export const dynamic = 'force-dynamic';

export default async function ImportarPage() {
    await requireSesion('configuracion');
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Actualizar desde el sistema anterior</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Trae al Hub los servicios hechos en el sistema viejo desde la última vez. No borra ni pisa nada, y se puede repetir las veces que haga falta.</p>
                </div>
            </div>
            <div style={{ maxWidth: 760, width: '100%' }}><ImportarBase /></div>
        </main>
    );
}
