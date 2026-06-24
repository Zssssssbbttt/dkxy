import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const employeeProfiles = pgTable("employee_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").unique(),

  // 基本信息
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  namePinyin: varchar("name_pinyin", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 50 }).notNull(),
  gender: varchar("gender", { length: 10 }).notNull(),
  birthDate: date("birth_date").notNull(),
  ethnicity: varchar("ethnicity", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  nativePlace: varchar("native_place", { length: 100 }).notNull(),
  politicalStatus: varchar("political_status", { length: 20 }).notNull(),

  // 任职信息
  departmentId: uuid("department_id").notNull(),
  position: varchar("position", { length: 50 }).notNull(),
  jobLevel: varchar("job_level", { length: 20 }).notNull(),
  supervisorId: uuid("supervisor_id"),
  workLocation: varchar("work_location", { length: 100 }).notNull(),
  costCenter: varchar("cost_center", { length: 50 }).notNull(),
  entryDate: date("entry_date").notNull(),
  regularDate: date("regular_date").notNull(),

  // 合同管理
  contractType: varchar("contract_type", { length: 20 }).notNull(),
  signDate: date("sign_date").notNull(),
  contractPeriod: varchar("contract_period", { length: 30 }).notNull(),
  renewalRemind: boolean("renewal_remind").notNull().default(false),
  contractFile: varchar("contract_file", { length: 500 }).notNull().default(""),

  // 详细档案（非必填）
  education: jsonb("education"),
  workHistory: jsonb("work_history"),
  projectExp: jsonb("project_exp"),
  languages: jsonb("languages"),
  certificates: jsonb("certificates"),
  skills: jsonb("skills"),

  // 家庭关系（非必填）
  parentNames: varchar("parent_names", { length: 100 }),
  parentPhones: varchar("parent_phones", { length: 50 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfiles.$inferInsert;