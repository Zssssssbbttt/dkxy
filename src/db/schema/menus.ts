import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { statusEnum } from "./users";

export const menus = pgTable("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  path: varchar("path", { length: 200 }),
  icon: varchar("icon", { length: 50 }),
  parentId: uuid("parent_id"),
  sort: varchar("sort", { length: 10 }).notNull().default("0"),
  status: statusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;