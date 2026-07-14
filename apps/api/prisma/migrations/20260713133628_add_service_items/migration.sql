-- CreateTable
CREATE TABLE "service_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "category" TEXT NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_items_code_key" ON "service_items"("code");

-- CreateIndex
CREATE INDEX "service_items_category_enabled_idx" ON "service_items"("category", "enabled");
