import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const businessUnits = pgTable("business_units", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 120 }).notNull().unique(),
  isOwnerBu: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
