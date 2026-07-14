/*
  Warnings:

  - You are about to drop the column `formula` on the `clearance_cost_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clearance_cost_configs" DROP COLUMN "formula";

-- AlterTable
ALTER TABLE "inquiry_orders" ADD COLUMN     "clearance_agent_id" UUID;

-- CreateTable
CREATE TABLE "clearance_cost_config_items" (
    "id" UUID NOT NULL,
    "cost_config_id" UUID NOT NULL,
    "service_item_id" UUID NOT NULL,
    "cost_amount" DECIMAL(18,2) NOT NULL,
    "profit_type" TEXT NOT NULL,
    "profit_value" DECIMAL(18,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearance_cost_config_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clearance_cost_config_items_cost_config_id_sort_order_idx" ON "clearance_cost_config_items"("cost_config_id", "sort_order");

-- CreateIndex
CREATE INDEX "inquiry_orders_clearance_agent_id_idx" ON "inquiry_orders"("clearance_agent_id");

-- AddForeignKey
ALTER TABLE "clearance_cost_config_items" ADD CONSTRAINT "clearance_cost_config_items_cost_config_id_fkey" FOREIGN KEY ("cost_config_id") REFERENCES "clearance_cost_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_cost_config_items" ADD CONSTRAINT "clearance_cost_config_items_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
