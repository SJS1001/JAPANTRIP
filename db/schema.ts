import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
