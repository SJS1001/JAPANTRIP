import assert from "node:assert/strict";
import test from "node:test";

import {
  readBoundedBody,
  readBoundedJson,
  RequestBodyTooLargeError,
} from "../lib/http-body.ts";

test("bounded JSON accepts a small body and rejects a streamed oversized body", async () => {
  const valid = new Request("https://trip.test/api", {
    method: "POST",
    body: JSON.stringify({ ok: true }),
  });
  assert.deepEqual(await readBoundedJson(valid, 64), { ok: true });

  const oversized = new Request("https://trip.test/api", {
    method: "POST",
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(5));
        controller.enqueue(new Uint8Array(6));
        controller.close();
      },
    }),
    duplex: "half",
  });
  await assert.rejects(
    readBoundedBody(oversized, 10),
    RequestBodyTooLargeError,
  );
});
