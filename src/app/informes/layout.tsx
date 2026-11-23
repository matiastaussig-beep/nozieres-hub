import { requireSesion } from '@/lib/auth';

export default async function SeccionLayout({ children }: { children: React.ReactNode }) {
    await requireSesion('informes');
    return <>{children}</>;
}
