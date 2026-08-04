import { role } from "@/lib/access";
import {
  EmergencyContactAccessError,
  EmergencyContactsModule,
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

function contactModule() {
  return new EmergencyContactsModule({
    store: new D1EmergencyContactStore(emergencyContactDatabase()),
  });
}

async function actorFor(
  request: Request,
  mutation: boolean,
): Promise<Exclude<EmergencyContactActor, null> | Response> {
  const accessRole = await role(request);
  if (!accessRole) {
    return Response.json(
      { error: "Family access is required." },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }
  if (mutation && accessRole !== "editor") {
    return Response.json(
      { error: "Editor access is required." },
      { status: 403, headers: PRIVATE_HEADERS },
    );
  }
  return { role: accessRole };
}

function errorResponse(error: unknown) {
  if (error instanceof EmergencyContactAccessError) {
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

export async function GET(request: Request) {
  const actor = await actorFor(request, false);
  if (actor instanceof Response) return actor;
  try {
    const contacts = await contactModule().list(actor);
    return Response.json(
      { contacts, role: actor.role },
      { headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const actor = await actorFor(request, true);
  if (actor instanceof Response) return actor;
  try {
    const input = (await request.json()) as EmergencyContactInput;
    const contact = await contactModule().create(actor, input);
    return Response.json(
      { contact },
      { status: 201, headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  const actor = await actorFor(request, true);
  if (actor instanceof Response) return actor;
  try {
    const payload = (await request.json()) as unknown;
    const orderedIds =
      payload && typeof payload === "object" && "orderedIds" in payload
        ? (payload as { orderedIds?: unknown }).orderedIds
        : undefined;
    await contactModule().reorder(actor, orderedIds as string[]);
    return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
