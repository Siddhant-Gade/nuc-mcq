CREATE TYPE "public"."broadcast_audience_type" AS ENUM('ALL', 'BATCH');--> statement-breakpoint
CREATE TYPE "public"."broadcast_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "broadcast_target" (
	"broadcast_id" uuid NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	CONSTRAINT "broadcast_target_broadcast_id_batch_id_pk" PRIMARY KEY("broadcast_id","batch_id")
);
--> statement-breakpoint
CREATE TABLE "broadcast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"status" "broadcast_status" DEFAULT 'DRAFT' NOT NULL,
	"audience_type" "broadcast_audience_type" NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broadcast_target" ADD CONSTRAINT "broadcast_target_broadcast_id_broadcast_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcast"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_target" ADD CONSTRAINT "broadcast_target_batch_id_batch_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("batch_id") ON DELETE cascade ON UPDATE no action;