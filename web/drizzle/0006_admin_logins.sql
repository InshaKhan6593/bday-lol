CREATE TABLE "admin_logins" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"ok" boolean NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_logins_at_idx" ON "admin_logins" USING btree ("at");