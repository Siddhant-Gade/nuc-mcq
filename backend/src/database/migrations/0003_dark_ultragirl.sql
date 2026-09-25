CREATE TYPE "public"."test_result_mode" AS ENUM('PRACTICE', 'EXAM');--> statement-breakpoint
CREATE TABLE "test_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_event_id" varchar(100) NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"test_id" varchar(100) NOT NULL,
	"mode" "test_result_mode" NOT NULL,
	"question_bank_version" varchar(50),
	"blueprint_version" varchar(50),
	"total_questions" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"wrong_count" integer NOT NULL,
	"score" double precision NOT NULL,
	"wrong_question_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_result_client_event_id_unique" UNIQUE("client_event_id"),
	CONSTRAINT "test_result_counts_total" CHECK ("test_result"."correct_count" <= "test_result"."total_questions"),
	CONSTRAINT "test_result_wrong_within_total" CHECK ("test_result"."wrong_count" <= "test_result"."total_questions"),
	CONSTRAINT "test_result_sum_within_total" CHECK (("test_result"."correct_count" + "test_result"."wrong_count") <= "test_result"."total_questions"),
	CONSTRAINT "test_result_score_non_negative" CHECK ("test_result"."score" >= 0)
);
--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_student_profile_id_student_profile_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profile"("id") ON DELETE cascade ON UPDATE no action;