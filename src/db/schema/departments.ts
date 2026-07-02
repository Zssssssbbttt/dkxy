import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { statusEnum } from "./users";

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  parentId: uuid("parent_id"),
  sort: varchar("sort", { length: 10 }).notNull().default("0"),
  status: statusEnum("status").notNull().default("active"),
  createdBy: uuid("created_by"),
  remark: varchar("remark", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;