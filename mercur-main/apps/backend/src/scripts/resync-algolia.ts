import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { AlgoliaEvents } from "@mercurjs/framework";

export default async function main({ container }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const eventBus = container.resolve(Modules.EVENT_BUS);

  const { data: published } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { status: "published" },
  });

  if (!published.length) {
    console.log("No published products to sync");
    return;
  }

  const ids = published.map((p) => p.id);
  console.log(`Emitting Algolia resync for ${ids.length} products...`);

  await eventBus.emit({
    name: AlgoliaEvents.PRODUCTS_CHANGED,
    data: { ids },
  });

  console.log("Done");

  // Ensure the process exits after emitting the event
  process.exit(0);
}
