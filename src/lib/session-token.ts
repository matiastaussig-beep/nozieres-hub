import crypto from 'crypto';
import { getSecret } from './secret';

export const SESSION_COOKIE = 'nh_session';
export const SESSION_DAYS = 14;

function sign(data: string) {
    return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(userId: number): string {
    const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
    return `${payload}.${sign(payload)}`;
}

/** Devuelve el id de usuario si la firma es válida y no venció; null si no. */
export function readSessionToken(token: string | undefined | null): number | null {
    if (!token) return null;
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = sign(payload);
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (typeof u !== 'number' || typeof e !== 'number' || e < Date.now()) return null;
        return u;
    } catch { return null; }
}
