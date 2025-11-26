import { getDb } from "@utils/database.ts";

/**
 * Quick sanity check that the credentials in .env can read/write.
 * Run with: deno run -A src/utils/test_mongo.ts
 */
const TEST_COLLECTION = "_connection_check";

try {
  console.log("URI:", Deno.env.get("MONGODB_URL"));
  const [db, client] = await getDb();
  const collection = db.collection(TEST_COLLECTION);

  const doc = {
    _id: crypto.randomUUID(),
    insertedAt: new Date(),
    note: "temporary connectivity probe",
  };

  await collection.insertOne(doc);
  const fetched = await collection.findOne({ _id: doc._id });

  if (!fetched) {
    throw new Error("Inserted document not found; read access failed.");
  }

  await collection.deleteOne({ _id: doc._id });
  console.log("MongoDB read/write test succeeded ✅");
  await client.close();
} catch (error) {
  console.error("MongoDB read/write test failed ❌");
  console.error(error);
  Deno.exit(1);
}

