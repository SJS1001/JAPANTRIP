import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        url: "data:text/javascript,export const env={}",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { requestFingerprint, requestRateLimitDecision } = await import("../db/request-rate-limit-store.ts");
const { authFingerprint } = await import("../db/auth-rate-limit-store.ts");

test("rate-limit fingerprints trust the edge address and ignore attacker-controlled user agents", async () => {
  const request = (ip, agent) => new Request("https://trip.test/api/auth", {
    headers: { "cf-connecting-ip": ip, "user-agent": agent },
  });
  assert.equal(
    await authFingerprint(request("203.0.113.4", "rotated-a")),
    await authFingerprint(request("203.0.113.4", "rotated-b")),
  );
  assert.notEqual(
    await authFingerprint(request("203.0.113.4", "same")),
    await authFingerprint(request("203.0.113.5", "same")),
  );
  assert.equal(
    await requestFingerprint(request("203.0.113.4", "rotated-a"), "assistant"),
    await requestFingerprint(request("203.0.113.4", "rotated-b"), "assistant"),
  );
});

test("request rate limit allows the configured quota", () => {
  assert.deepEqual(
    requestRateLimitDecision(
      { attempts: 3, window_started: 1_000 },
      3,
      60_000,
      30_000,
    ),
    { allowed: true, remaining: 0, retryAfter: 0 },
  );
});

test("request rate limit blocks excess requests until the window ends", () => {
  assert.deepEqual(
    requestRateLimitDecision(
      { attempts: 4, window_started: 1_000 },
      3,
      60_000,
      31_500,
    ),
    { allowed: false, remaining: 0, retryAfter: 30 },
  );
});
