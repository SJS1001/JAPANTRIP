import { role } from "@/lib/access";
import {
  EmergencyContactAccessError,
  EmergencyContactsModule,
  EmergencyContactNotFoundError,
  EmergencyContactValidationError,
  type EmergencyContactActor,
  type EmergencyContactInput,
} from "@/lib/emergency-contacts";
import {
  D1EmergencyContactStore,
  emergencyContactDatabase,
} from "@/db/emergency-contact-store";

const PRIVATE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
};

type RouteContext = { params: Promise<{ id: string }> };

function contactModule() {
  return new EmergencyContactsModule({
    store: new D1EmergencyContactStore(emergencyContactDatabase()),
  });
}

async function editorFor(
  request: Request,
): Promise<EmergencyContactActor | Response> {
  const accessRole = await role(request);
  if (!accessRole) {
    return Response.json(
      { error: "Family access is required." },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }
  if (accessRole !== "editor") {
    return Response.json(
      { error: "Editor access is required." },
      { status: 403, headers: PRIVATE_HEADERS },
    );
  }
  return { role: accessRole };
}

function errorResponse(error: unknown) {
  if (
    error instanceof EmergencyContactAccessError ||
    error instanceof EmergencyContactNotFoundError
  ) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: PRIVATE_HEADERS },
    );
  }
  if (error instanceof EmergencyContactValidationError || error instanceof SyntaxError) {
    return Response.json(
      {
        error:
          error instanceof EmergencyContactValidationError
            ? error.message
            : "Contact details must be valid JSON.",
        ...(error instanceof EmergencyContactValidationError
          ? { field: error.field }
          : {}),
      },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
  return Response.json(
    { error: "Emergency contacts are temporarily unavailable." },
    { status: 500, headers: PRIVATE_HEADERS },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await editorFor(request);
  if (actor instanceof Response) return actor;
  try {
    const { id } = await context.params;
    const patch = (await request.json()) as Partial<EmergencyContactInput>;
    const contact = await contactModule().update(actor, id, patch);
    return Response.json({ contact }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await editorFor(request);
  if (actor instanceof Response) return actor;
  try {
    const { id } = await context.params;
    await contactModule().softDelete(actor, id);
    return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
