import { accessCookie, verifyCode } from "@/lib/access";
import { clearAuthFailures, consumeAuthAttempt } from "@/db/auth-rate-limit-store";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http-body";

const PRIVATE_HEADERS = { "cache-control": "private, no-store, max-age=0" };

export async function POST(request: Request) {
  try {
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return Response.json(
        { error: "Use JSON to submit an access code." },
        { status: 415, headers: PRIVATE_HEADERS },
      );
    }
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 2 * 1024) {
      return Response.json(
        { error: "The access request is too large." },
        { status: 413, headers: PRIVATE_HEADERS },
      );
    }
    const limit = await consumeAuthAttempt(request);
    if (!limit.allowed) {
      return Response.json(
        { error: "Too many access attempts. Try again later." },
        {
          status: 429,
          headers: { ...PRIVATE_HEADERS, "retry-after": String(limit.retryAfter) },
        },
      );
    }
    const payload = (await readBoundedJson(request, 2 * 1024)) as { code?: string };
    const code = typeof payload.code === "string" ? payload.code.trim() : "";
    if (code.length > 256) {
      return Response.json(
        { error: "That family access code is not correct." },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    }
    const role = code ? await verifyCode(code) : null;
    if (!role) {
      return Response.json(
        { error: "That family access code is not correct." },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    }
    await clearAuthFailures(request);
    return new Response(JSON.stringify({ ok: true, role }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        ...PRIVATE_HEADERS,
        "set-cookie": await accessCookie(request, role),
      },
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The access request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Access is unavailable." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
