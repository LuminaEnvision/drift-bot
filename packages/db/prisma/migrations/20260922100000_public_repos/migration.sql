ALTER TABLE "repos" ALTER COLUMN "installation_id" DROP NOT NULL;
ALTER TABLE "repos" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'public';
