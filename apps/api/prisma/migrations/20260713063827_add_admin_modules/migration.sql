-- CreateTable
CREATE TABLE "clearance_quotes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inquiry_order_id" UUID NOT NULL,
    "business_number" TEXT NOT NULL,
    "line_items" JSONB NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "margin_percent" DECIMAL(5,2),
    "cost_amount" DECIMAL(18,2) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "internal_notes" TEXT,
    "customer_notes" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clearance_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_agents" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_address" TEXT,
    "special_ports" TEXT,
    "qualifications" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "performance_rating" DECIMAL(3,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clearance_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_cost_configs" (
    "id" UUID NOT NULL,
    "agent_id" UUID,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "formula" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearance_cost_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_quote_configs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "margin_percent" DECIMAL(5,2) NOT NULL,
    "minimum_charge" DECIMAL(18,2),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearance_quote_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_services" (
    "id" UUID NOT NULL,
    "service_type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin_region" TEXT,
    "destination_region" TEXT,
    "pricing_model" TEXT NOT NULL,
    "base_price" DECIMAL(18,2) NOT NULL,
    "unit_price" DECIMAL(18,4),
    "vehicle_type" TEXT,
    "container_type" TEXT,
    "surcharges" JSONB,
    "conditions" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "truck_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_entries" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_zh" TEXT NOT NULL,
    "name_en" TEXT,
    "parent_code" TEXT,
    "extra" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clearance_quotes_inquiry_order_id_key" ON "clearance_quotes"("inquiry_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_quotes_business_number_key" ON "clearance_quotes"("business_number");

-- CreateIndex
CREATE INDEX "clearance_quotes_tenant_id_status_idx" ON "clearance_quotes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "clearance_quotes_inquiry_order_id_idx" ON "clearance_quotes"("inquiry_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_agents_code_key" ON "clearance_agents"("code");

-- CreateIndex
CREATE INDEX "clearance_agents_status_idx" ON "clearance_agents"("status");

-- CreateIndex
CREATE INDEX "clearance_cost_configs_agent_id_priority_idx" ON "clearance_cost_configs"("agent_id", "priority");

-- CreateIndex
CREATE INDEX "clearance_quote_configs_priority_idx" ON "clearance_quote_configs"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "truck_services_code_key" ON "truck_services"("code");

-- CreateIndex
CREATE INDEX "truck_services_service_type_enabled_idx" ON "truck_services"("service_type", "enabled");

-- CreateIndex
CREATE INDEX "dictionary_entries_category_enabled_idx" ON "dictionary_entries"("category", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_category_code_key" ON "dictionary_entries"("category", "code");

-- AddForeignKey
ALTER TABLE "clearance_quotes" ADD CONSTRAINT "clearance_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_quotes" ADD CONSTRAINT "clearance_quotes_inquiry_order_id_fkey" FOREIGN KEY ("inquiry_order_id") REFERENCES "inquiry_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_cost_configs" ADD CONSTRAINT "clearance_cost_configs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "clearance_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
