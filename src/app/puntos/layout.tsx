import { requireSesion } from '@/lib/auth';

export default async function L({ children }: { children: React.ReactNode }) {
    await requireSesion('puntos.control');
    return <>{children}</>;
}
