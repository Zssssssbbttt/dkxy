import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["super_admin", "admin", "user"]);
export const statusEnum = pgEnum("status", ["active", "inactive"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  departmentId: uuid("department_id"),
  role: roleEnum("role").notNull().default("user"),
  status: statusEnum("status").notNull().default("active"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;