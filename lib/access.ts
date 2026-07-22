import { env } from "cloudflare:workers";

const COOKIE_NAME = "japan_trip_family_access";

function accessCode(): string {
  const value = (env as unknown as { FAMILY_ACCESS_CODE?: string })
    .FAMILY_ACCESS_CODE;
  if (!value) throw new Error("Family access is not configured.");
  return value;
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(`japan-trip-2026|${value}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const part = cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${COOKIE_NAME}=`));
  return part ? decodeURIComponent(part.slice(COOKIE_NAME.length + 1)) : "";
}

export async function verifyCode(candidate: string) {
  const [received, expected] = await Promise.all([
    digest(candidate),
    digest(accessCode()),
  ]);
  if (received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function isAuthorized(request: Request) {
  const cookie = cookieValue(request);
  if (!cookie) return false;
  const expected = await digest(accessCode());
  if (cookie.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= cookie.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function accessCookie(request: Request, code: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const token = await digest(code);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure}`;
}

export function clearAccessCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
