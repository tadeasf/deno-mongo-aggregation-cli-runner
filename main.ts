import { MongoClient, AggregatePipeline, Document } from "https://deno.land/x/mongo@v0.31.1/mod.ts";

async function main() {
  const uri = prompt("Enter MongoDB URI connection string:");
  if (!uri) {
    console.error("MongoDB URI is required.");
    Deno.exit(1);
  }

  const dbName = prompt("Enter database name:");
  if (!dbName) {
    console.error("Database name is required.");
    Deno.exit(1);
  }

  const collectionName = prompt("Enter collection name:");
  if (!collectionName) {
    console.error("Collection name is required.");
    Deno.exit(1);
  }

  console.log("Copy your aggregation pipeline to clipboard and press Enter when ready:");
  await Deno.stdin.read(new Uint8Array(1));

  const pipelineText = await readFromClipboard();
  console.log("Processed JSON:", pipelineText);

  let pipeline: AggregatePipeline<Document>[];
  try {
    // Convert MongoDB-style operators to valid JSON
    const jsonString = pipelineText
      .replace(/'/g, '"')
      .replace(/(\w+):/g, '"$1":')
      .replace(/\$(\w+):/g, '"$$1":');
    
    pipeline = JSON.parse(jsonString);
    if (!Array.isArray(pipeline)) {
      throw new Error("Pipeline must be an array");
    }
  } catch (error) {
    console.error("Invalid JSON input:", error.message);
    console.error("Received input:", pipelineText);
    Deno.exit(1);
  }

  const client = new MongoClient();
  try {
    await client.connect(uri);
    const database = client.database(dbName);
    const collection = database.collection(collectionName);

    const cursor = collection.aggregate(pipeline);
    const result = await cursor.toArray();

    const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
    const fileName = `${dbName}_${collectionName}_${timestamp}.json`;

    await Deno.writeTextFile(fileName, JSON.stringify(result, null, 2));
    console.log(`Results saved to ${fileName}`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

async function readFromClipboard(): Promise<string> {
  let cmd: string[];
  switch (Deno.build.os) {
    case "darwin":
      cmd = ["pbpaste"];
      break;
    case "windows":
      cmd = ["powershell.exe", "Get-Clipboard"];
      break;
    case "linux":
      cmd = ["xclip", "-selection", "clipboard", "-o"];
      break;
    default:
      throw new Error("Unsupported operating system");
  }

  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
  });

  const { stdout } = await command.output();
  return new TextDecoder().decode(stdout).trim();
}

if (import.meta.main) {
  main();
}