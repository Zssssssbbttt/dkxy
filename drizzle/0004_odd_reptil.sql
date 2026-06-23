CREATE TYPE "public"."menu_type" AS ENUM('menu', 'button');--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "name_en" varchar(50);--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "code" varchar(50);--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "type" "menu_type" DEFAULT 'menu' NOT NULL;