const { algoliasearch } = require("algoliasearch");

const APP_ID = process.env.ALGOLIA_APP_ID;
const API_KEY = process.env.ALGOLIA_API_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || "products";

async function main() {
  if (!APP_ID || !API_KEY) {
    throw new Error("Missing ALGOLIA_APP_ID or ALGOLIA_API_KEY");
  }

  const client = algoliasearch(APP_ID, API_KEY);

  console.log(`Fetching index '${INDEX_NAME}' via search pagination...`);
  const objects = [];

  const hitsPerPage = 1000;
  let page = 0;
  while (true) {
    const res = await client.search({
      requests: [
        {
          indexName: INDEX_NAME,
          query: "",
          hitsPerPage,
          page,
        },
      ],
    });

    const result = res.results[0];
    objects.push(...result.hits);

    if (page >= result.nbPages - 1) {
      break;
    }
    page += 1;
  }

  console.log(`Fetched ${objects.length} objects`);

  const updated = [];

  for (const obj of objects) {
    const variants = Array.isArray(obj.variants) ? obj.variants : [];
    let changed = false;

    const newVariants = variants.map((variant) => {
      const prices = Array.isArray(variant.prices) ? [...variant.prices] : [];
      const hasUsd = prices.some((p) => p.currency_code === "usd");

      if (!hasUsd && prices.length > 0) {
        const base = prices[0];
        const minimal = {
          currency_code: "usd",
          amount: base.amount,
        };
        prices.push(minimal);
        changed = true;
      }

      return { ...variant, prices };
    });

    if (changed) {
      updated.push({ ...obj, variants: newVariants });
    }
  }

  console.log(`Objects needing update: ${updated.length}`);

  if (updated.length === 0) {
    console.log("Nothing to update");
    return;
  }

  const chunkSize = 200;
  let processed = 0;

  while (processed < updated.length) {
    const chunk = updated.slice(processed, processed + chunkSize);
    await client.saveObjects({
      indexName: INDEX_NAME,
      objects: chunk,
      autoGenerateObjectIDIfNotExist: false,
    });
    processed += chunk.length;
    console.log(`Saved ${processed}/${updated.length}`);
  }

  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
