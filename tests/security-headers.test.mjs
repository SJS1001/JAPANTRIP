import assert from "node:assert/strict";
import test from "node:test";

import { withSecurityHeaders } from "../lib/security-headers.ts";

test("every app response receives the production browser security policy", () => {
  const response = withSecurityHeaders(new Response("ok"), new Request("https://trip.test/"));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(response.headers.get("permissions-policy") ?? "", /geolocation=\(self\)/);
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=/);
});
