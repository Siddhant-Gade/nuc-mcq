CREATE TYPE "public"."student_access_status" AS ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "student_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"status" "student_access_status" DEFAULT 'PENDING' NOT NULL,
	"access_granted_at" timestamp with time zone,
	"access_expiry_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_access_student_profile_id_unique" UNIQUE("student_profile_id"),
	CONSTRAINT "student_access_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "student_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(320),
	"mobile" varchar(30),
	"institute_id" varchar(100) NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"photo_path" text,
	"course_info" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profile_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "student_access" ADD CONSTRAINT "student_access_student_profile_id_student_profile_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profile"("id") ON DELETE cascade ON UPDATE no action;