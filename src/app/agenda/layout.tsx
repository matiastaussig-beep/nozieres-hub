import { requireSesion } from '@/lib/auth';

export default async function L({ children }: { children: React.ReactNode }) {
    await requireSesion('agenda.ver');
    return <>{children}</>;
}
