import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, code: string) {
  await page.getByLabel("Family access code").fill(code);
  await page.getByRole("button", { name: "Open calendar" }).click();
  await expect(page.getByRole("heading", { name: "Japan 2026" })).toBeVisible();
}

test("editor deep links, My Day, settings, and exclusive filters work", async ({ page }) => {
  await page.goto("/?view=calendar&date=2026-08-11");
  await signIn(page, "e2e-editor-code");
  await expect(page).toHaveURL(/view=calendar/);

  await page.getByRole("button", { name: "My Day" }).click();
  await expect(page).toHaveURL(/view=my-day/);
  await expect(page.getByLabel("Trip day", { exact: true })).toHaveValue("2026-08-11");
  await expect(page.getByRole("button", { name: "View full day in calendar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  await page.getByRole("button", { name: "View full day in calendar" }).click();
  await expect(page).toHaveURL(/view=calendar/);

  const attraction = page.getByRole("button", { name: /Attraction/i }).first();
  await attraction.dispatchEvent("pointerdown", { pointerType: "touch", button: 0, isPrimary: true, clientX: 20, clientY: 20 });
  await page.waitForTimeout(600);
  await attraction.dispatchEvent("pointerup", { pointerType: "touch", button: 0, isPrimary: true, clientX: 20, clientY: 20 });
  await expect(attraction).toHaveClass(/exclusive/);

  await page.getByLabel("Open calendar settings").click();
  await expect(page.getByRole("button", { name: "Create PDF backup" })).toBeVisible();
  await expect(page.getByText("OpenAI trip questions", { exact: true })).toBeVisible();
});

test("Kid Mode is read-only and exposes current safety context", async ({ page }) => {
  await page.goto("/?view=calendar&date=2026-08-11");
  await signIn(page, "e2e-viewer-code");
  await expect(page.getByText("Kid Mode · Read only")).toBeVisible();
  await expect(page.getByLabel("Trip day", { exact: true })).toHaveValue("2026-08-11");
  await expect(page.getByRole("button", { name: "Full Plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open .* in calendar/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Emergency" }).first()).toBeVisible();
  await page.getByText("Live safety, heat & rail updates").click();
  await expect(page.getByRole("heading", { name: "Live context" })).toBeVisible();
});

test("saved My Day cold-reloads with agenda content while offline", async ({ page, context }) => {
  await page.goto("/?view=my-day&date=2026-08-11");
  await signIn(page, "e2e-viewer-code");
  await expect(page.getByLabel("Trip day", { exact: true })).toHaveValue("2026-08-11");
  await page.getByRole("button", { name: "Save offline" }).click();
  await expect(page.getByText(/saved trip copy/i)).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByLabel("Trip day", { exact: true })).toHaveValue("2026-08-11");
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open("japan-trip-public-assets-v2");
    return (await cache.keys()).some((request) => new URL(request.url).pathname.startsWith("/assets/"));
  })).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Kid Mode · Read only")).toBeVisible();
  await expect(page.getByText("Osaka Castle grounds", { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test("Inbox can stage a document without sending it to OpenAI", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "e2e-editor-code");
  await page.getByRole("link", { name: "Document Inbox" }).click();
  await page.getByLabel(/Ticket, reservation/).setInputFiles({
    name: "test-ticket.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nminimal e2e ticket"),
  });
  await expect(page.getByRole("button", { name: "Upload and analyze with OpenAI" })).toBeDisabled();
  await page.getByRole("button", { name: "Upload only" }).click();
  await expect(page.getByText(/uploaded privately without AI analysis/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "test-ticket.pdf" }).first()).toBeVisible();
});

test("viewer reconnect removes a revoked private offline file", async ({ page }) => {
  await page.goto("/?view=calendar&date=2026-08-11");
  await signIn(page, "e2e-editor-code");

  const attachment = await page.evaluate(async () => {
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4WQAAAAASUVORK5CYII="),
      (character) => character.charCodeAt(0),
    );
    const form = new FormData();
    form.set("tripItemId", "a17");
    form.set("label", "ticket");
    form.set("viewerApproved", "true");
    form.set("file", new File([png], `revocation-${crypto.randomUUID()}.png`, { type: "image/png" }));
    const response = await fetch("/api/attachments", { method: "POST", body: form });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    return (await response.json()).attachment;
  });

  await page.evaluate(async ({ savedAttachment }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("japan-trip-private-files-v1", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("attachments")) {
          request.result.createObjectStore("attachments", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("attachments", "readwrite");
      transaction.objectStore("attachments").put({
        ...savedAttachment,
        blob: new Blob(["private offline copy"], { type: savedAttachment.mediaType }),
        savedAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { savedAttachment: attachment });

  const revoked = await page.evaluate(async (id) => {
    const response = await fetch(`/api/attachments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ viewerApproved: false }),
    });
    return response.ok;
  }, attachment.id);
  expect(revoked).toBe(true);

  await page.evaluate(async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("japanTripAccessRole");
  });
  await page.reload();
  await signIn(page, "e2e-viewer-code");

  await expect.poll(() => page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("japan-trip-private-files-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise((resolve, reject) => {
      const request = database.transaction("attachments", "readonly").objectStore("attachments").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return Boolean(saved);
  }, attachment.id)).toBe(false);
});
