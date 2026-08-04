export class RequestBodyTooLargeError extends Error {
  readonly status = 413;
  constructor(message = "The request body is too large.") {
    super(message);
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readBoundedBody(request: Request, maximumBytes: number) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedJson(request: Request, maximumBytes: number): Promise<unknown> {
  const bytes = await readBoundedBody(request, maximumBytes);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function readBoundedFormData(request: Request, maximumBytes: number) {
  const contentType = request.headers.get("content-type") ?? "";
  const bytes = await readBoundedBody(request, maximumBytes);
  return new Response(bytes, { headers: { "content-type": contentType } }).formData();
}
