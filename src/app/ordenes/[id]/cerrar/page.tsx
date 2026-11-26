import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** El cierre ahora está dentro de la pantalla de la orden (firma + cierre). Esta ruta queda por si alguien tiene el link viejo. */
export default async function CerrarOrden({ params }: { params: Promise<{ id: string }> }) {
    const id = parseInt((await params).id);
    redirect(`/ordenes/${id}#firma`);
}
