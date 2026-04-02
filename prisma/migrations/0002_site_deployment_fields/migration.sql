-- Add GitHub and Cloud Run deployment fields to Site
ALTER TABLE "sites" ADD COLUMN "githubRepo" TEXT;
ALTER TABLE "sites" ADD COLUMN "cloudRunService" TEXT;
ALTER TABLE "sites" ADD COLUMN "cloudRunRegion" TEXT NOT NULL DEFAULT 'us-central1';
