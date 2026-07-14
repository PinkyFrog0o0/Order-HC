-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "contact" JSONB,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_number" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "trade_type" TEXT NOT NULL,
    "incoterm" TEXT NOT NULL,
    "origin_country" CHAR(3) NOT NULL,
    "destination_country" CHAR(3) NOT NULL,
    "origin_port" TEXT NOT NULL,
    "destination_port" CHAR(3) NOT NULL,
    "total_gross_weight_kg" DECIMAL(12,3) NOT NULL,
    "total_net_weight_kg" DECIMAL(12,3) NOT NULL,
    "total_packages" INTEGER NOT NULL,
    "total_value" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "template_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inquiry_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inquiry_order_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "hs_code" VARCHAR(12) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "gross_weight_kg" DECIMAL(12,3) NOT NULL,
    "net_weight_kg" DECIMAL(12,3) NOT NULL,
    "packages" INTEGER NOT NULL,
    "origin_country" CHAR(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_attachments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inquiry_order_id" UUID,
    "attachment_type" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "content_type" TEXT NOT NULL,
    "sha256" TEXT,
    "parsed_data" JSONB,
    "parse_status" TEXT NOT NULL DEFAULT 'pending',
    "parse_error" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inquiry_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "tenants_code_idx" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "inquiry_orders_business_number_key" ON "inquiry_orders"("business_number");

-- CreateIndex
CREATE INDEX "inquiry_orders_tenant_id_status_idx" ON "inquiry_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "inquiry_orders_tenant_id_created_at_idx" ON "inquiry_orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "inquiry_orders_business_number_idx" ON "inquiry_orders"("business_number");

-- CreateIndex
CREATE INDEX "inquiry_items_tenant_id_inquiry_order_id_idx" ON "inquiry_items"("tenant_id", "inquiry_order_id");

-- CreateIndex
CREATE INDEX "inquiry_items_hs_code_idx" ON "inquiry_items"("hs_code");

-- CreateIndex
CREATE INDEX "inquiry_attachments_tenant_id_inquiry_order_id_idx" ON "inquiry_attachments"("tenant_id", "inquiry_order_id");

-- CreateIndex
CREATE INDEX "inquiry_attachments_tenant_id_attachment_type_idx" ON "inquiry_attachments"("tenant_id", "attachment_type");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_orders" ADD CONSTRAINT "inquiry_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_orders" ADD CONSTRAINT "inquiry_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_inquiry_order_id_fkey" FOREIGN KEY ("inquiry_order_id") REFERENCES "inquiry_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_inquiry_order_id_fkey" FOREIGN KEY ("inquiry_order_id") REFERENCES "inquiry_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
