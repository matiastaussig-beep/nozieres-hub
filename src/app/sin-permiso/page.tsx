import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function SinPermiso() {
    return (
        <main className="main-container">
            <div className="hero-glass" style={{ maxWidth: 520, textAlign: 'center' }}>
                <ShieldAlert size={40} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
                <h1 className="app-title" style={{ fontSize: '1.6rem' }}>No tenés acceso a esta sección</h1>
                <p className="app-subtitle">Tu rol no incluye esta pantalla. Si la necesitás, pedile al administrador.</p>
                <Link href="/" className="btn-primary">Volver al inicio</Link>
            </div>
        </main>
    );
}
