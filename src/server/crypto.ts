// Web Crypto API-based Authentication & Password Hashing
// Works universally in Cloudflare Workers and Node.js v16+

const ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'iron_campus_recruitment_jwt_secret_key_2026';

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return toHex(salt.buffer);
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBytes = fromHex(saltHex);

  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    256
  );

  return toHex(key);
}

export async function verifyPassword(password: string, saltHex: string, expectedHash: string): Promise<boolean> {
  const computedHash = await hashPassword(password, saltHex);
  return computedHash === expectedHash;
}

// Minimal, zero-dependency JWT Implementation using Web Crypto
function base64UrlEncode(str: string): string {
  const b64 = Buffer.from(str).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'TPO' | 'COORDINATOR' | 'HR';
  driveId?: string;
  companyName?: string;
  fullName: string;
  iat: number;
  exp: number;
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresInSeconds = 86400 * 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(JWT_SECRET_STRING);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
  const signatureB64 = Buffer.from(signatureBuffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${dataToSign}.${signatureB64}`;
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey(JWT_SECRET_STRING);
    let sigB64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (sigB64.length % 4) sigB64 += '=';
    const sigBytes = Buffer.from(sigB64, 'base64');

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes as any, new TextEncoder().encode(dataToVerify));
    if (!isValid) return null;

    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}
