import { env } from "cloudflare:workers";

import {
  classifyAccessCode,
  createSessionToken,
  verifySessionToken,
  type AccessRole,
  type FamilyAccessCodes,
} from "@/lib/session-token";

const COOKIE_NAME = "japan_trip_family_access";

type AccessEnvironment = {
  FAMILY_ACCESS_CODE?: string;
  FAMILY_EDITOR_ACCESS_CODE?: string;
  FAMILY_VIEWER_ACCESS_CODE?: string;
  FAMILY_SESSION_SECRET?: string;
};

function accessEnvironment() {
  return env as unknown as AccessEnvironment;
}

function accessCodes(): FamilyAccessCodes {
  const configured = accessEnvironment();
  return {
    editorCode: configured.FAMILY_EDITOR_ACCESS_CODE,
    viewerCode: configured.FAMILY_VIEWER_ACCESS_CODE,
    legacyEditorCode: configured.FAMILY_ACCESS_CODE,
  };
}

function sessionSecret() {
  const configured = accessEnvironment();
  const value =
    configured.FAMILY_SESSION_SECRET ||
    configured.FAMILY_EDITOR_ACCESS_CODE ||
    configured.FAMILY_ACCESS_CODE;
  if (!value) throw new Error("Family access is not configured.");
  return `japan-trip-session-v1|${value}`;
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const part = cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${COOKIE_NAME}=`));
  if (!part) return "";
  try {
    return decodeURIComponent(part.slice(COOKIE_NAME.length + 1));
  } catch {
    return "";
  }
}

export async function verifyCode(candidate: string): Promise<AccessRole | null> {
  return classifyAccessCode(candidate, accessCodes());
}

export async function role(request: Request): Promise<AccessRole | null> {
  const token = cookieValue(request);
  if (!token) return null;
  return verifySessionToken(token, sessionSecret());
}

export async function isAuthorized(request: Request) {
  return (await role(request)) !== null;
}

export async function requireViewer(request: Request): Promise<AccessRole> {
  const accessRole = await role(request);
  if (!accessRole) throw new AccessDeniedError(401);
  return accessRole;
}

export async function requireEditor(request: Request): Promise<"editor"> {
  const accessRole = await role(request);
  if (!accessRole) throw new AccessDeniedError(401);
  if (accessRole !== "editor") throw new AccessDeniedError(403);
  return accessRole;
}

export class AccessDeniedError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? "Family access is required." : "Editor access is required.");
    this.name = "AccessDeniedError";
    this.status = status;
  }
}

export async function accessCookie(request: Request, accessRole: AccessRole) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const token = await createSessionToken(accessRole, sessionSecret());
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure}`;
}

export function clearAccessCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
