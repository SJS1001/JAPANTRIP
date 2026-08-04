import { accessCookie, verifyCode } from "@/lib/access";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { code?: string };
    const code = payload.code?.trim() ?? "";
    const role = code ? await verifyCode(code) : null;
    if (!role) {
      return Response.json({ error: "That family access code is not correct." }, { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true, role }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": await accessCookie(request, role),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Access is unavailable." },
      { status: 500 },
    );
  }
}
