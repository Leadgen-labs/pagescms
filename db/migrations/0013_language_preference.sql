CREATE TABLE "language_preference" (
	"email" text PRIMARY KEY NOT NULL,
	"language" text DEFAULT 'cs' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "language_preference_supported" CHECK ("language_preference"."language" IN ('cs', 'en'))
);
