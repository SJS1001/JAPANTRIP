import assert from "node:assert/strict";
import test from "node:test";

import {
  AttachmentAccessError,
  AttachmentModule,
  AttachmentNotFoundError,
  AttachmentValidationError,
  MAX_ATTACHMENT_BYTES,
  MemoryAttachmentBlobStore,
  MemoryAttachmentMetadataStore,
} from "../lib/attachments.ts";

const editor = { role: "editor", id: "parent" };

function pdfBytes() {
  return new TextEncoder().encode("%PDF-1.7\nexample booking");
}

function moduleFixture() {
  const blobs = new MemoryAttachmentBlobStore();
  const metadata = new MemoryAttachmentMetadataStore();
  const ids = [
    "019a57ab-35f1-7d34-ae19-a54d5513eb8c",
    "019a57ab-35f1-7d34-ae19-a54d5513eb8d",
  ];
  return {
    blobs,
    metadata,
    attachments: new AttachmentModule({
      blobs,
      metadata,
      randomId: () => ids.shift() ?? crypto.randomUUID(),
      now: () => new Date("2026-08-04T12:00:00.000Z"),
    }),
  };
}

test("editor uploads a signature-verified private PDF without exposing its object key", async () => {
  const { attachments } = moduleFixture();

  const uploaded = await attachments.upload(editor, {
    tripItemId: "osaka-hotel",
    displayName: "Fraser reservation.png",
    bytes: pdfBytes(),
    claimedMediaType: "application/pdf",
    label: "reservation",
    viewerApproved: true,
  });

  assert.deepEqual(uploaded, {
    id: "019a57ab-35f1-7d34-ae19-a54d5513eb8c",
    tripItemId: "osaka-hotel",
    displayName: "Fraser reservation.png",
    mediaType: "application/pdf",
    size: 24,
    label: "reservation",
    viewerApproved: true,
    uploadedAt: "2026-08-04T12:00:00.000Z",
    deletedAt: null,
  });
  assert.equal("objectKey" in uploaded, false);
  assert.equal("url" in uploaded, false);
});

test("uploads larger than 10 MB are rejected before storage", async () => {
  const { attachments, blobs } = moduleFixture();
  const oversized = new Uint8Array(MAX_ATTACHMENT_BYTES + 1);
  oversized.set([0x25, 0x50, 0x44, 0x46, 0x2d]);

  await assert.rejects(
    attachments.upload(editor, {
      tripItemId: "ticket",
      displayName: "large.pdf",
      bytes: oversized,
    }),
    (error) => {
      assert.ok(error instanceof AttachmentValidationError);
      assert.equal(error.code, "file-too-large");
      return true;
    },
  );
  assert.equal(blobs.size, 0);
});

test("viewer and anonymous uploads are denied before any file is stored", async () => {
  for (const actor of [{ role: "viewer", id: "kid" }, null]) {
    const { attachments, blobs } = moduleFixture();

    await assert.rejects(
      attachments.upload(actor, {
        tripItemId: "osaka-hotel",
        displayName: "booking.pdf",
        bytes: pdfBytes(),
      }),
      (error) => {
        assert.ok(error instanceof AttachmentAccessError);
        assert.equal(error.status, actor ? 403 : 401);
        return true;
      },
    );
    assert.equal(blobs.size, 0);
  }
});

test("the allowlist is based on real PDF, JPEG, PNG, and WebP signatures", async () => {
  const samples = [
    ["application/pdf", pdfBytes()],
    ["image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00])],
    ["image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/webp", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])],
  ];

  for (const [mediaType, bytes] of samples) {
    const { attachments } = moduleFixture();
    const uploaded = await attachments.upload(editor, {
      tripItemId: "ticket",
      displayName: "misleading.exe",
      bytes,
      claimedMediaType: mediaType,
    });
    assert.equal(uploaded.mediaType, mediaType);
  }

  const { attachments } = moduleFixture();
  await assert.rejects(
    attachments.upload(editor, {
      tripItemId: "ticket",
      displayName: "fake.pdf",
      bytes: new TextEncoder().encode("not a PDF"),
      claimedMediaType: "application/pdf",
    }),
    /signature/i,
  );
  await assert.rejects(
    attachments.upload(editor, {
      tripItemId: "ticket",
      displayName: "wrong.png",
      bytes: pdfBytes(),
      claimedMediaType: "image/png",
    }),
    /signature/i,
  );
});

test("viewer lists only approved active files while editor can list all active files", async () => {
  const { attachments } = moduleFixture();
  const approved = await attachments.upload(editor, {
    tripItemId: "osaka-hotel",
    displayName: "hotel-card.pdf",
    bytes: pdfBytes(),
    viewerApproved: true,
  });
  await attachments.upload(editor, {
    tripItemId: "osaka-hotel",
    displayName: "private-invoice.pdf",
    bytes: pdfBytes(),
    viewerApproved: false,
  });

  assert.deepEqual(
    (await attachments.list({ role: "viewer", id: "kid" }, { tripItemId: "osaka-hotel" }))
      .map((item) => item.id),
    [approved.id],
  );
  assert.equal(
    (await attachments.list(editor, { tripItemId: "osaka-hotel" })).length,
    2,
  );
  await assert.rejects(
    attachments.list(null, { tripItemId: "osaka-hotel" }),
    (error) => error instanceof AttachmentAccessError && error.status === 401,
  );
});

test("an unrecognized role cannot be treated as an editor on read paths", async () => {
  const { attachments } = moduleFixture();
  await attachments.upload(editor, {
    tripItemId: "hotel",
    displayName: "private.pdf",
    bytes: pdfBytes(),
  });

  await assert.rejects(
    attachments.list({ role: "administrator" }),
    (error) => error instanceof AttachmentAccessError && error.status === 403,
  );
});

test("viewer reads an approved private blob with safe response metadata and cannot probe unapproved files", async () => {
  const { attachments } = moduleFixture();
  const approved = await attachments.upload(editor, {
    tripItemId: "rail",
    displayName: "ticket\r\nX-Evil: yes.pdf",
    bytes: pdfBytes(),
    viewerApproved: true,
  });
  const hidden = await attachments.upload(editor, {
    tripItemId: "rail",
    displayName: "invoice.pdf",
    bytes: pdfBytes(),
  });

  const opened = await attachments.read({ role: "viewer", id: "kid" }, approved.id);
  assert.deepEqual(opened.body, pdfBytes());
  assert.equal(opened.metadata.id, approved.id);
  assert.equal(opened.headers["content-type"], "application/pdf");
  assert.equal(opened.headers["cache-control"], "private, no-store");
  assert.equal(opened.headers["x-content-type-options"], "nosniff");
  assert.doesNotMatch(opened.headers["content-disposition"], /[\r\n]/);
  assert.equal("objectKey" in opened.metadata, false);
  assert.equal("url" in opened, false);

  await assert.rejects(
    attachments.read({ role: "viewer", id: "kid" }, hidden.id),
    (error) => error instanceof AttachmentNotFoundError && error.status === 404,
  );
  await assert.rejects(
    attachments.read(null, approved.id),
    (error) => error instanceof AttachmentAccessError && error.status === 401,
  );
});

test("only an editor can label, rename, and approve an attachment for viewers", async () => {
  const { attachments } = moduleFixture();
  const uploaded = await attachments.upload(editor, {
    tripItemId: "rail",
    displayName: "scan.pdf",
    bytes: pdfBytes(),
  });

  await assert.rejects(
    attachments.label({ role: "viewer", id: "kid" }, uploaded.id, {
      viewerApproved: true,
    }),
    (error) => error instanceof AttachmentAccessError && error.status === 403,
  );

  const updated = await attachments.label(editor, uploaded.id, {
    displayName: "Shinkansen ticket.pdf",
    label: "ticket",
    viewerApproved: true,
  });
  assert.equal(updated.displayName, "Shinkansen ticket.pdf");
  assert.equal(updated.label, "ticket");
  assert.equal(updated.viewerApproved, true);
  assert.equal(
    (await attachments.read({ role: "viewer", id: "kid" }, uploaded.id)).metadata.id,
    uploaded.id,
  );
});

test("editor soft deletion is hidden from viewers and recoverable without deleting the blob", async () => {
  const { attachments, blobs } = moduleFixture();
  const uploaded = await attachments.upload(editor, {
    tripItemId: "rail",
    displayName: "ticket.pdf",
    bytes: pdfBytes(),
    viewerApproved: true,
  });

  await assert.rejects(
    attachments.softDelete({ role: "viewer", id: "kid" }, uploaded.id),
    (error) => error instanceof AttachmentAccessError && error.status === 403,
  );
  const deleted = await attachments.softDelete(editor, uploaded.id);
  assert.equal(deleted.deletedAt, "2026-08-04T12:00:00.000Z");
  assert.equal(blobs.size, 1);
  assert.deepEqual(await attachments.list({ role: "viewer" }), []);
  await assert.rejects(
    attachments.read({ role: "viewer" }, uploaded.id),
    (error) => error instanceof AttachmentNotFoundError,
  );
  assert.equal((await attachments.list(editor, { includeDeleted: true }))[0].deletedAt, deleted.deletedAt);

  const restored = await attachments.restore(editor, uploaded.id);
  assert.equal(restored.deletedAt, null);
  assert.deepEqual((await attachments.read({ role: "viewer" }, uploaded.id)).body, pdfBytes());
});

test("blob object keys are opaque random identifiers unrelated to display names", async () => {
  const { attachments, blobs } = moduleFixture();
  await attachments.upload(editor, {
    tripItemId: "hotel",
    displayName: "SECRET-CONFIRMATION-123.pdf",
    bytes: pdfBytes(),
  });

  assert.deepEqual(blobs.keys(), ["019a57ab-35f1-7d34-ae19-a54d5513eb8d"]);
  assert.doesNotMatch(blobs.keys()[0], /SECRET|CONFIRMATION|pdf|hotel/i);
});

test("failed metadata persistence removes the newly written private blob", async () => {
  class FailingMetadataStore extends MemoryAttachmentMetadataStore {
    async insert() {
      throw new Error("database unavailable");
    }
  }
  const blobs = new MemoryAttachmentBlobStore();
  const attachments = new AttachmentModule({
    blobs,
    metadata: new FailingMetadataStore(),
    randomId: (() => {
      const ids = [crypto.randomUUID(), crypto.randomUUID()];
      return () => ids.shift();
    })(),
  });

  await assert.rejects(
    attachments.upload(editor, {
      tripItemId: "hotel",
      displayName: "booking.pdf",
      bytes: pdfBytes(),
    }),
    /database unavailable/,
  );
  assert.equal(blobs.size, 0);
});
