import { loginAction } from '@/lib/auth-actions';
import { Lock, User, ShieldCheck, MapPin, Building, KeyRound } from 'lucide-react';
import Image from 'next/image';

interface Props {
    searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
    const { error } = await searchParams;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background glow effects */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
                
                {/* Logo Header */}
                <div className="text-center mb-8">
                    <div className="bg-white/95 p-3 rounded-2xl inline-block mb-4 shadow-lg border border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Nozieres Lubricantes" className="h-10 object-contain mx-auto" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Acceso al Sistema</h1>
                    <p className="text-xs text-slate-400 mt-1">Plataforma Operativa Multi-Sucursal</p>
                </div>

                {error === 'invalid' && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center font-medium">
                        ⚠️ Usuario o contraseña incorrectos. Por favor verifique sus datos.
                    </div>
                )}

                {error === 'bloqueado' && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center font-medium">
                        ⛔ Demasiados intentos. Esperá 15 minutos y volvé a probar.
                    </div>
                )}

                {error === 'empty' && (
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs text-center font-medium">
                        ⚠️ Por favor complete todos los campos requeridos.
                    </div>
                )}


                <form action={loginAction} className="space-y-5">
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                            <User size={14} className="text-amber-400" /> Usuario / Legajo
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                name="username" 
                                required 
                                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white outline-none transition" 
                                placeholder="Tu usuario" autoComplete="username" autoCapitalize="none" 
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                            <KeyRound size={14} className="text-amber-400" /> Contraseña
                        </label>
                        <div className="relative">
                            <input 
                                type="password" 
                                name="password" 
                                required 
                                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white outline-none transition" 
                                placeholder="••••••••" autoComplete="current-password" 
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                    >
                        <ShieldCheck size={18} /> Iniciar Sesión Operativa
                    </button>
                </form>

                <div className="mt-6 text-center text-[11px] text-slate-400">
                    Nozieres Lubricantes © {new Date().getFullYear()} · Todos los derechos reservados.
                </div>
            </div>
        </main>
    );
}
