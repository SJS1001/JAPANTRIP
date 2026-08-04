import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tripState = sqliteTable("trip_state", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by").notNull().default("Family"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tripHistory = sqliteTable("trip_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  version: integer("version").notNull(),
  action: text("action").notNull(),
  changedBy: text("changed_by").notNull().default("Family"),
  changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const geocodeCache = sqliteTable("geocode_cache", {
  query: text("query").primaryKey(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const geocodeRateLimit = sqliteTable("geocode_rate_limit", {
  id: text("id").primaryKey(),
  lastRequestAt: integer("last_request_at").notNull().default(0),
});

export const weatherCache = sqliteTable("weather_cache", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});

export const weatherRefreshLock = sqliteTable("weather_refresh_lock", {
  id: text("id").primaryKey(),
  lastRequestAt: integer("last_request_at").notNull().default(0),
});

export const requestRateLimits = sqliteTable(
  "request_rate_limits",
  {
    scope: text("scope").notNull(),
    fingerprint: text("fingerprint").notNull(),
    attempts: integer("attempts").notNull().default(0),
    windowStarted: integer("window_started").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.fingerprint] }),
    index("request_rate_limits_updated_idx").on(table.updatedAt),
  ],
);

export const familySettings = sqliteTable("family_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const emergencyContacts = sqliteTable("emergency_contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  relationship: text("relationship"),
  phone: text("phone").notNull(),
  alternatePhone: text("alternate_phone"),
  email: text("email"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const developmentNotes = sqliteTable(
  "development_notes",
  {
    id: text("id").primaryKey(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("development_notes_updated_idx").on(table.deletedAt, table.updatedAt)],
);

export const developmentNoteScreenshots = sqliteTable(
  "development_note_screenshots",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id").notNull().references(() => developmentNotes.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull().unique(),
    displayName: text("display_name").notNull(),
    mediaType: text("media_type").notNull(),
    size: integer("size").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("development_note_screenshots_note_idx").on(table.noteId, table.deletedAt, table.uploadedAt)],
);

export const familyRatings = sqliteTable(
  "family_ratings",
  {
    id: text("id").primaryKey(),
    targetId: text("target_id").notNull(),
    targetKind: text("target_kind").notNull(),
    memberName: text("member_name").notNull(),
    memberKey: text("member_key").notNull(),
    stars: integer("stars").notNull(),
    comment: text("comment"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("family_ratings_target_member_idx").on(table.targetId, table.memberKey),
    index("family_ratings_target_idx").on(table.targetId, table.deletedAt, table.memberName),
  ],
);

export const tripAttachments = sqliteTable(
  "trip_attachments",
  {
    id: text("id").primaryKey(),
    tripItemId: text("trip_item_id").notNull(),
    objectKey: text("object_key").notNull().unique(),
    displayName: text("display_name").notNull(),
    mediaType: text("media_type").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    label: text("label"),
    viewerApproved: integer("viewer_approved", { mode: "boolean" })
      .notNull()
      .default(false),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("trip_attachments_item_idx").on(table.tripItemId),
    index("trip_attachments_uploaded_at_idx").on(table.uploadedAt),
    index("trip_attachments_deleted_at_idx").on(table.deletedAt),
  ],
);

export const inboxDocuments = sqliteTable(
  "inbox_documents",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull().unique(),
    filename: text("filename").notNull(),
    mediaType: text("media_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    contentSha256: text("content_sha256").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedRole: text("uploaded_role").notNull(),
    baseTripVersion: integer("base_trip_version").notNull(),
    status: text("status").notNull().default("staged"),
    failureReason: text("failure_reason"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("inbox_documents_status_created_idx").on(table.status, table.createdAt)],
);

export const inboxProposals = sqliteTable(
  "inbox_proposals",
  {
    id: text("id").notNull(),
    revision: integer("revision").notNull().default(1),
    documentId: text("document_id")
      .notNull()
      .references(() => inboxDocuments.id, { onDelete: "cascade" }),
    schemaVersion: integer("schema_version").notNull().default(1),
    kind: text("kind").notNull(),
    baseTripVersion: integer("base_trip_version").notNull(),
    candidateEventIdsJson: text("candidate_event_ids_json").notNull(),
    evidenceJson: text("evidence_json").notNull(),
    outcomeJson: text("outcome_json").notNull(),
    integritySha256: text("integrity_sha256"),
    status: text("status").notNull().default("pending"),
    decidedBy: text("decided_by"),
    decidedAt: text("decided_at"),
    appliedTripVersion: integer("applied_trip_version"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.revision] }),
    index("inbox_proposals_document_status_idx").on(
      table.documentId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const inboxProposalApplications = sqliteTable(
  "inbox_proposal_applications",
  {
    proposalId: text("proposal_id").notNull(),
    proposalRevision: integer("proposal_revision").notNull(),
    integritySha256: text("integrity_sha256").notNull(),
    baseTripVersion: integer("base_trip_version").notNull(),
    appliedTripVersion: integer("applied_trip_version").notNull(),
    approvedBy: text("approved_by").notNull(),
    appliedAt: text("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.proposalId, table.proposalRevision] })],
);
