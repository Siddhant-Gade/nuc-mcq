CREATE TYPE "public"."authorization_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "authorization_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "authorization_request_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "authorization_request" ADD CONSTRAINT "authorization_request_student_profile_id_student_profile_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profile"("id") ON DELETE cascade ON UPDATE no action;