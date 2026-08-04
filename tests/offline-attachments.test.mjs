import assert from "node:assert/strict";
import test from "node:test";

import { saveOfflineAttachment } from "../lib/client/offline-attachments.ts";

test("offline attachment saves wait for the IndexedDB transaction to commit", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  const lateAbort = new Error("storage quota changed before commit");

  globalThis.indexedDB = {
    open() {
      const openRequest = {};
      const database = {
        objectStoreNames: { contains: () => true },
        close() {},
        transaction() {
          const transaction = {
            error: null,
            objectStore() {
              return {
                put() {
                  const request = { result: undefined, error: null };
                  queueMicrotask(() => {
                    request.result = "attachment-1";
                    request.onsuccess?.();
                    queueMicrotask(() => {
                      transaction.error = lateAbort;
                      transaction.onabort?.();
                    });
                  });
                  return request;
                },
              };
            },
          };
          return transaction;
        },
      };
      openRequest.result = database;
      queueMicrotask(() => openRequest.onsuccess?.());
      return openRequest;
    },
  };

  try {
    await assert.rejects(
      saveOfflineAttachment(
        {
          id: "attachment-1",
          tripItemId: "a17",
          displayName: "castle-ticket.png",
          mediaType: "image/png",
          size: 22,
          label: "ticket",
          viewerApproved: true,
          uploadedAt: "2026-08-04T12:00:00.000Z",
        },
        new Blob(["private ticket image"], { type: "image/png" }),
      ),
      lateAbort,
    );
  } finally {
    if (originalIndexedDb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = originalIndexedDb;
  }
});
