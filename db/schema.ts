import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
