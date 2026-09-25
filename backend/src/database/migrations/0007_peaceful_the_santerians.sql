CREATE TABLE "question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sr" integer,
	"section" varchar(100) NOT NULL,
	"question_en" text NOT NULL,
	"opt_a_en" text NOT NULL,
	"opt_b_en" text NOT NULL,
	"opt_c_en" text NOT NULL,
	"opt_d_en" text NOT NULL,
	"correct_option" varchar(10) DEFAULT 'A',
	"correct_index" integer DEFAULT 0 NOT NULL,
	"correct_answer" text,
	"explanation_en" text,
	"question_mr" text,
	"opt_a_mr" text,
	"opt_b_mr" text,
	"opt_c_mr" text,
	"opt_d_mr" text,
	"explanation_mr" text,
	"question_hi" text,
	"opt_a_hi" text,
	"opt_b_hi" text,
	"opt_c_hi" text,
	"opt_d_hi" text,
	"explanation_hi" text,
	"institute_id" varchar(100) DEFAULT 'INST001' NOT NULL,
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "question_section_idx" ON "question" USING btree ("section");--> statement-breakpoint
CREATE INDEX "question_institute_idx" ON "question" USING btree ("institute_id");