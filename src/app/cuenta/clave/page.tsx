import { cambiarClaveAction } from '@/lib/auth-actions';
import { getSesion } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { KeyRound } from 'lucide-react';

const MSG: Record<string, string> = {
    actual: 'La clave actual no es correcta.',
    corta: 'La clave nueva debe tener al menos 8 caracteres.',
    distinta: 'La clave nueva y su repetición no coinciden.',
    igual: 'La clave nueva tiene que ser distinta de la actual.',
};

export default async function ClavePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const s = await getSesion();
    if (!s) redirect('/login');
    const { error } = await searchParams;
    return (
        <main className="main-container">
            <form action={cambiarClaveAction} className="hero-glass" style={{ maxWidth: 440, width: '100%' }}>
                <h1 className="app-title" style={{ fontSize: '1.5rem', display: 'flex', gap: 8, alignItems: 'center' }}><KeyRound size={22} /> Cambiar clave</h1>
                {s.debeCambiarClave && <p className="app-subtitle">Por seguridad tenés que elegir una clave nueva antes de seguir.</p>}
                {error && <p style={{ color: '#f87171', fontSize: '.85rem', marginBottom: '1rem' }}>⚠️ {MSG[error] || 'Revisá los datos.'}</p>}
                <div className="form-group"><label>Clave actual</label><input className="form-input" type="password" name="actual" required autoComplete="current-password" /></div>
                <div className="form-group"><label>Clave nueva (mínimo 8 caracteres)</label><input className="form-input" type="password" name="nueva" required minLength={8} autoComplete="new-password" /></div>
                <div className="form-group"><label>Repetir clave nueva</label><input className="form-input" type="password" name="repetir" required minLength={8} autoComplete="new-password" /></div>
                <button className="btn-primary" type="submit">Guardar clave</button>
            </form>
        </main>
    );
}
