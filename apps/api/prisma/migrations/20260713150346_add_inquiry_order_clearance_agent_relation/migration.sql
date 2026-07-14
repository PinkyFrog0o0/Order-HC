-- AddForeignKey
ALTER TABLE "inquiry_orders" ADD CONSTRAINT "inquiry_orders_clearance_agent_id_fkey" FOREIGN KEY ("clearance_agent_id") REFERENCES "clearance_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
