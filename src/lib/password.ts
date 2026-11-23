import crypto from 'crypto';

const PREFIX = 'scrypt$';
export function isHashed(v: string | null | undefined) { return !!v && v.startsWith(PREFIX); }

export function hashPassword(plain: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
    return `${PREFIX}${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
    if (!isHashed(stored)) return false;
    const [, saltHex, keyHex] = stored.split('$');
    if (!saltHex || !keyHex) return false;
    const key = crypto.scryptSync(plain, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(keyHex, 'hex');
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}
