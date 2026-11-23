import Link from 'next/link';
import { LayoutDashboard, Users, Wrench, Settings, Car, BarChart3, CalendarDays, MessageSquare, Award, LogOut, UserCog } from 'lucide-react';
import { getSesion, can, ROL_NOMBRE } from '@/lib/auth';
import { logoutAction } from '@/lib/auth-actions';
import SucursalSelector from './SucursalSelector';

export default async function Navbar() {
    const s = await getSesion();
    if (!s) return null;
    const item = (href: string, icon: React.ReactNode, label: string, permiso: string) =>
        can(s.rol, permiso) ? <li key={href}><Link href={href} className="nav-item">{icon} {label}</Link></li> : null;

    return (
        <nav className="navbar">
            <div className="flex items-center gap-3">
                <div className="navbar-logo">
                    <Link href="/">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Nozieres" />
                    </Link>
                </div>
                <SucursalSelector sucursales={s.sucursales} activa={s.sucursalActivaId} puedeConsolidado={s.rol === 'administrador'} />
            </div>
            <ul className="nav-links">
                {item('/', <LayoutDashboard size={15} />, 'Inicio', 'dashboard')}
                {item('/agenda', <CalendarDays size={15} />, 'Agenda', 'agenda.ver')}
                {item('/ordenes', <Wrench size={15} />, 'Órdenes', 'ordenes.ver')}
                {item('/clientes', <Users size={15} />, 'Clientes', 'clientes.ver')}
                {item('/vehiculos', <Car size={15} />, 'Vehículos', 'vehiculos.ver')}
                {item('/mensajes', <MessageSquare size={15} />, 'Mensajes', 'mensajes')}
                {item('/puntos', <Award size={15} />, 'Puntos', 'puntos.control')}
                {item('/informes', <BarChart3 size={15} />, 'Informes', 'informes')}
                {item('/configuracion', <Settings size={15} />, 'Configuración', 'configuracion')}
                {item('/configuracion/usuarios', <UserCog size={15} />, 'Usuarios', 'usuarios')}
                <li>
                    <form action={logoutAction} style={{ display: 'inline' }}>
                        <button type="submit" className="nav-item" title={`${s.nombre} · ${ROL_NOMBRE[s.rol]}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <LogOut size={15} /> Salir
                        </button>
                    </form>
                </li>
            </ul>
        </nav>
    );
}
