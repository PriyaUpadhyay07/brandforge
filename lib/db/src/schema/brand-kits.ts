import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const brandKitsTable = pgTable("brand_kits", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  industry: text("industry").notNull(),
  primaryColor: text("primary_color").notNull(),
  personality: text("personality").notNull(),
  headingFont: text("heading_font").notNull(),
  bodyFont: text("body_font").notNull(),
  tagline: text("tagline"),
  toneNotes: text("tone_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBrandKitSchema = createInsertSchema(brandKitsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKitsTable.$inferSelect;