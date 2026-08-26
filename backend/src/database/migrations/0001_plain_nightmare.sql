CREATE TYPE "public"."batch_status" AS ENUM('ACTIVE', 'FULL', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "batch" (
	"batch_id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_name" varchar(200) NOT NULL,
	"institute_id" varchar(100) NOT NULL,
	"capacity" integer NOT NULL,
	"status" "batch_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batch_capacity_positive" CHECK ("batch"."capacity" > 0)
);
