import { MongoClient } from "mongodb";
import type { Document } from "mongodb";
import { DB } from "./utils/db";
import { measureQueryPerformance, getMongodVersion } from "./utils/benchmarking";
import { generateCharts } from "./utils/charts";
import readline from 'readline';
import clipboard from 'clipboardy';

async function main() {
  const db = new DB("performance.db");
  await db.init();

  const args = process.argv.slice(2);
  if (args.includes("generateCharts")) {
    await generateCharts(db);
    return;
  }

  let runCount = 1;
  const nIndex = args.indexOf('-n');
  if (nIndex !== -1 && nIndex + 1 < args.length) {
    runCount = parseInt(args[nIndex + 1], 10);
    if (isNaN(runCount) || runCount < 1) {
      console.error("Invalid value for -n. Using default value of 1.");
      runCount = 1;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const uri = await new Promise<string>(resolve => rl.question("Enter MongoDB URI connection string: ", resolve));
  if (!uri) {
    console.error("MongoDB URI is required.");
    process.exit(1);
  }

  const dbName = await new Promise<string>(resolve => rl.question("Enter database name: ", resolve));
  const collectionName = await new Promise<string>(resolve => rl.question("Enter collection name: ", resolve));

  console.log("Copy your aggregation pipeline to clipboard and press Enter when ready:");
  await new Promise<void>(resolve => rl.once('line', resolve));

  let pipeline: Document[];
  try {
    const pipelineText = await clipboard.read();
    pipeline = JSON.parse(pipelineText);
    console.log("Processed pipeline:");
    console.log(JSON.stringify(pipeline, null, 2));
  } catch (error) {
    console.error("Invalid pipeline input:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    const mongodVersion = await getMongodVersion(client);

    for (let i = 0; i < runCount; i++) {
      console.log(`Running aggregation ${i + 1} of ${runCount}`);
      const { startTime, endTime, duration } = await measureQueryPerformance(async () => {
        const cursor = collection.aggregate(pipeline);
        await cursor.toArray();
      });

      await db.insertQueryPerformance({
        uri,
        database: dbName,
        collection: collectionName,
        startTime,
        endTime,
        queryDuration: duration,
        mongodVersion
      });

      console.log(`Query ${i + 1} executed in ${duration}`);
    }

    console.log(`All ${runCount} queries completed. Performance data saved to database.`);

  } catch (error) {
    console.error("Error during aggregation:");
    console.error(error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
    rl.close();
  }
}

if (import.meta.main) {
  main();
}