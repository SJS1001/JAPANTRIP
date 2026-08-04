export type AccessRole = "viewer" | "editor";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;
const encoder = new TextEncoder();

type SessionPayload = {
  v: 1;
  role: AccessRole;
  exp: number;
};

export type TripOperation = "read" | "write";
export type TripAccessDecision =
  | { allowed: true; role: AccessRole }
  | { allowed: false; status: 401 | 403 };

export type FamilyAccessCodes = {
  editorCode?: string;
  viewerCode?: string;
  legacyEditorCode?: string;
};

export function authorizeTripOperation(
  role: AccessRole | null,
  operation: TripOperation,
): TripAccessDecision {
  if (!role) return { allowed: false, status: 401 };
  if (operation === "write" && role !== "editor") {
    return { allowed: false, status: 403 };
  }
  return { allowed: true, role };
}

async function digestAccessCode(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`japan-trip-2026|${value}`),
    ),
  );
}

export async function classifyAccessCode(
  candidate: string,
  codes: FamilyAccessCodes,
): Promise<AccessRole | null> {
  if (!candidate) return null;
  const received = await digestAccessCode(candidate);
  const configured: Array<[AccessRole, string | undefined]> = [
    ["editor", codes.editorCode],
    ["editor", codes.legacyEditorCode],
    ["viewer", codes.viewerCode],
  ];

  const comparisons = await Promise.all(
    configured.map(async ([role, code]) => ({
      role,
      matches: code
        ? constantTimeEqual(received, await digestAccessCode(code))
        : false,
    })),
  );
  return comparisons.find(({ matches }) => matches)?.role ?? null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

export async function createSessionToken(
  role: AccessRole,
  secret: string,
  now = Date.now(),
) {
  const payload: SessionPayload = {
    v: 1,
    role,
    exp: now + SESSION_DURATION_MS,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const encodedSignature = toBase64Url(await signature(encodedPayload, secret));
  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<AccessRole | null> {
  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra) return null;
    const expectedSignature = await signature(encodedPayload, secret);
    const receivedSignature = fromBase64Url(encodedSignature);
    if (!constantTimeEqual(receivedSignature, expectedSignature)) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as Partial<SessionPayload>;
    if (payload.v !== 1 || (payload.role !== "viewer" && payload.role !== "editor")) {
      return null;
    }
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= now) {
      return null;
    }
    return payload.role;
  } catch {
    return null;
  }
}
