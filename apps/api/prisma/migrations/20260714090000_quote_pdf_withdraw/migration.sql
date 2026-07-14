-- AlterTable
ALTER TABLE "clearance_quotes"
  ADD COLUMN "withdrawn_at" TIMESTAMP(3),
  ADD COLUMN "withdrawn_by_id" UUID,
  ADD COLUMN "pdf_url" TEXT,
  ADD COLUMN "pdf_generated_at" TIMESTAMP(3);
