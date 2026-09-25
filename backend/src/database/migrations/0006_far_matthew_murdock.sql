CREATE TYPE "public"."document_file_type" AS ENUM('PDF', 'DOC', 'DOCX');--> statement-breakpoint
CREATE TYPE "public"."study_material_kind" AS ENUM('DOCUMENT', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."study_material_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "study_material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"kind" "study_material_kind" NOT NULL,
	"status" "study_material_status" DEFAULT 'DRAFT' NOT NULL,
	"file_path" text,
	"file_name" varchar(255),
	"file_size" integer,
	"document_type" "document_file_type",
	"youtube_video_id" varchar(32),
	"batch_id" varchar(100),
	"uploaded_by" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_material_document_fields" CHECK ("study_material"."kind" <> 'DOCUMENT' OR ("study_material"."file_path" IS NOT NULL AND "study_material"."file_name" IS NOT NULL AND "study_material"."file_size" IS NOT NULL AND "study_material"."document_type" IS NOT NULL AND "study_material"."youtube_video_id" IS NULL)),
	CONSTRAINT "study_material_video_fields" CHECK ("study_material"."kind" <> 'VIDEO' OR ("study_material"."youtube_video_id" IS NOT NULL AND "study_material"."file_path" IS NULL AND "study_material"."file_name" IS NULL AND "study_material"."file_size" IS NULL AND "study_material"."document_type" IS NULL)),
	CONSTRAINT "study_material_file_size_max" CHECK ("study_material"."file_size" IS NULL OR ("study_material"."file_size" > 0 AND "study_material"."file_size" <= 5242880))
);
--> statement-breakpoint
ALTER TABLE "study_material" ADD CONSTRAINT "study_material_batch_id_batch_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("batch_id") ON DELETE cascade ON UPDATE no action;