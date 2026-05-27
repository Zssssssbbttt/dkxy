import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

export const todoCreateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题不超过200字"),
});

export const todoUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});
