/**
 * A single fixed credential, held in the environment.
 *
 * This is a demo gate. It keeps a proof of concept off the open internet; it
 * is not an identity system and it is not a safeguard for protected health
 * information. There are no user accounts, no password reset and no audit
 * trail. Do not put real resident data behind it.
 *
 * Credentials are read from APP_USERNAME and APP_PASSWORD with no fallback:
 * if either is unset, nobody can sign in and the login page says so.
 *
 * Uses Web Crypto so the same code runs in the Node.js runtime and in the
 * proxy, which runs on the Edge runtime.
 */

export const SESSION_COOKIE = "ndi_session";

/** Eight hours. Long enough for a working session, short enough to expire. */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function authConfigured(): boolean {
  return env("APP_USERNAME").length > 0 && env("APP_PASSWORD").length > 0;
}

/**
 * The signing key. AUTH_SECRET when set, otherwise derived from the password
 * so that changing the password invalidates every existing session.
 */
function secretMaterial(): string {
  const explicit = env("AUTH_SECRET");
  if (explicit) return explicit;
  return `${env("APP_USERNAME")}:${env("APP_PASSWORD")}`;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretMaterial()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time comparison, so a wrong guess leaks nothing through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  if (!authConfigured()) return false;
  // Both comparisons always run, so neither field short-circuits the other.
  const userOk = timingSafeEqual(username, env("APP_USERNAME"));
  const passOk = timingSafeEqual(password, env("APP_PASSWORD"));
  return userOk && passOk;
}

export async function issueToken(): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiry);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${toBase64Url(signature)}`;
}

export async function tokenIsValid(token: string | undefined | null): Promise<boolean> {
  if (!token || !authConfigured()) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry * 1000 < Date.now()) return false;

  const expected = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(payload),
  );
  return timingSafeEqual(signature, toBase64Url(expected));
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
