import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken, SESSION_COOKIE } from './lib/session-token';

// Rutas que se pueden abrir sin iniciar sesión
const PUBLICAS = [
    /^\/login(\/|$)/,
    /^\/p\/[A-Za-z0-9_-]+/,        // portal del cliente (enlace con token privado)
    /^\/v\/[A-Za-z0-9_-]+/,        // certificado de historial del vehículo (token)
    /^\/api\/health$/,
    /^\/api\/cron\//,              // protegida por su propia clave
    /^\/_next\//,
    /^\/(logo\.png|manifest\.json|favicon\.ico|icon.*|robots\.txt)$/,
];

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (PUBLICAS.some(r => r.test(pathname))) return NextResponse.next();
    if (readSessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
