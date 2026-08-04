const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests",
].join("; ");

export function withSecurityHeaders(response: Response, request: Request) {
  const secured = new Response(response.body, response);
  secured.headers.set("content-security-policy", CONTENT_SECURITY_POLICY);
  secured.headers.set("cross-origin-opener-policy", "same-origin");
  secured.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(self)");
  secured.headers.set("referrer-policy", "no-referrer");
  secured.headers.set("x-content-type-options", "nosniff");
  secured.headers.set("x-frame-options", "DENY");
  if (new URL(request.url).protocol === "https:") {
    secured.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return secured;
}
