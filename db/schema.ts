import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
